defmodule CodebattleWeb.Mcp.ToolsTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.ApiAuditEvent
  alias Codebattle.Mcp.Oauth
  alias Codebattle.Mcp.Tools
  alias Codebattle.UserApiToken

  setup do
    Cachex.clear(:public_api_rate_limit_cache)
    FunWithFlags.disable(:public_api_disabled)
    FunWithFlags.disable(:public_api_writes_disabled)
    %{user: old_user()}
  end

  defp old_user, do: insert(:user, inserted_at: NaiveDateTime.add(NaiveDateTime.utc_now(), -30, :day))

  defp open_client(conn, user, scopes \\ ["read", "games:write", "tournaments:write"]) do
    {:ok, client} = Oauth.register(%{"redirect_uris" => ["http://localhost:8765/callback"]})
    verifier = Base.url_encode64(:crypto.strong_rand_bytes(32), padding: false)

    params = %{
      "client_id" => client.id,
      "redirect_uri" => hd(client.redirect_uris),
      "response_type" => "code",
      "code_challenge" => verifier |> then(&:crypto.hash(:sha256, &1)) |> Base.url_encode64(padding: false),
      "code_challenge_method" => "S256",
      "resource" => Oauth.resource(),
      "scope" => Enum.join(scopes, " ")
    }

    {:ok, uri} = Oauth.approve(user, params)
    code = uri |> URI.parse() |> Map.fetch!(:query) |> URI.decode_query() |> Map.fetch!("code")

    {:ok, tokens} =
      Oauth.exchange(
        Map.merge(params, %{"grant_type" => "authorization_code", "code" => code, "code_verifier" => verifier})
      )

    client = %{token: tokens.access_token, session: nil}

    initialized =
      rpc(conn, client, "initialize", %{
        protocolVersion: "2025-03-26",
        capabilities: %{},
        clientInfo: %{name: "tools test", version: "1"}
      })

    assert json_response(initialized, 200)
    [session] = get_resp_header(initialized, "mcp-session-id")
    client = %{client | session: session}
    assert conn |> rpc(client, "notifications/initialized", %{}, false) |> response(202)
    client
  end

  defp rpc(conn, client, method, params, request \\ true) do
    body = %{jsonrpc: "2.0", method: method, params: params}
    body = if request, do: Map.put(body, :id, System.unique_integer([:positive])), else: body

    conn =
      conn
      |> put_req_header("authorization", "Bearer " <> client.token)
      |> put_req_header("content-type", "application/json")
      |> put_req_header("accept", "application/json, text/event-stream")

    conn = if client.session, do: put_req_header(conn, "mcp-session-id", client.session), else: conn
    post(conn, "/mcp", body)
  end

  defp call(conn, client, name, args \\ %{}), do: rpc(conn, client, "tools/call", %{name: name, arguments: args})

  defp success(conn) do
    assert %{"result" => %{"isError" => false, "structuredContent" => data}} = json_response(conn, 200)
    data
  end

  defp failure(conn, code) do
    assert %{"result" => %{"isError" => true, "structuredContent" => %{"error" => %{"code" => ^code}} = data}} =
             json_response(conn, 200)

    data
  end

  defp tournament_body do
    %{
      "name" => "MCP cup",
      "description" => "Created through MCP",
      "level" => "easy",
      "starts_at" => DateTime.to_iso8601(DateTime.add(DateTime.utc_now(:second), 1, :day)),
      "rounds_limit" => 2,
      "players_limit" => 8
    }
  end

  test "catalog covers every public API operation including the legacy event leaderboard" do
    routes =
      CodebattleWeb.Router.__routes__()
      |> Enum.filter(&String.starts_with?(&1.path, "/public_api/v1/"))
      |> Enum.reject(&(&1.path == "/public_api/v1/openapi.json"))
      |> MapSet.new(
        &{&1.verb |> to_string() |> String.upcase(),
         &1.path |> String.replace_prefix("/public_api/v1", "") |> String.replace(":id", "{id}")}
      )

    assert MapSet.new(Tools.all(), &{&1.method, &1.path}) == routes
  end

  test "lists schemas, scopes and write annotations even for a read-only connection", %{conn: conn, user: user} do
    client = open_client(conn, user, ["read"])
    assert %{"result" => %{"tools" => tools}} = conn |> rpc(client, "tools/list", %{}) |> json_response(200)
    assert length(tools) == 26
    create = Enum.find(tools, &(&1["name"] == "create_game"))
    assert create["inputSchema"]["required"] == ["opponent"]
    assert create["inputSchema"]["properties"]["timeout_seconds"]["maximum"] == 3600
    assert create["inputSchema"]["additionalProperties"] == false
    assert create["description"] =~ "games:write"
    assert create["annotations"]["readOnlyHint"] == false
  end

  test "read tools use the same visibility and response shapes as REST", %{conn: conn, user: user} do
    client = open_client(conn, user)
    own = insert(:task, name: "my_hidden", visibility: "hidden", creator_id: user.id)
    insert(:task, name: "other_hidden", visibility: "hidden", creator_id: insert(:user).id)
    public = insert(:task, name: "public_task")
    task_ids = conn |> call(client, "list_tasks") |> success() |> Map.fetch!("tasks") |> Enum.map(& &1["id"])
    assert Enum.sort(task_ids) == Enum.sort([own.id, public.id])

    {:ok, _, token} = UserApiToken.create(user, %{name: "compare"})

    for {name, path} <- [
          {"get_me", "/me"},
          {"get_active_game", "/me/active_game"},
          {"list_my_games", "/me/games"},
          {"list_my_tournaments", "/me/tournaments"},
          {"list_live_games", "/games/live"},
          {"list_live_tournaments", "/tournaments/live"},
          {"list_tournament_schedule", "/tournaments/schedule"},
          {"list_invites", "/me/invites"},
          {"list_online_users", "/users/online"}
        ] do
      rest =
        conn |> put_req_header("authorization", "Bearer " <> token) |> get("/public_api/v1" <> path) |> json_response(200)

      result = conn |> call(client, name) |> success()
      assert Map.delete(result, "server_time") == Map.delete(rest, "server_time")
    end

    assert %{"user" => %{"id" => id}, "active_game" => nil, "invites" => [], "tournaments" => []} =
             conn |> call(client, "get_my_state") |> success()

    assert id == user.id
    assert %{"items" => _} = conn |> call(client, "get_event_leaderboard", %{"id" => 1_234_567}) |> success()
  end

  test "read-only grants cannot perform any write and receive an OAuth scope challenge", %{conn: conn, user: user} do
    client = open_client(conn, user, ["read"])

    for tool <- Tools.all(), tool.method != "GET" do
      response = call(conn, client, tool.name)
      assert %{"error" => "insufficient_scope"} = json_response(response, 403)
      assert hd(get_resp_header(response, "www-authenticate")) =~ ~s(scope="#{tool.scope}")
    end

    assert Repo.aggregate(ApiAuditEvent, :count) == 0
  end

  test "creates and cancels a game and records OAuth identity in the common quota ledger", %{conn: conn, user: user} do
    client = open_client(conn, user)
    insert(:task, level: "easy")

    assert %{"game" => %{"id" => id, "state" => "waiting_opponent"}} =
             conn |> call(client, "create_game", %{"level" => "easy", "opponent" => "link"}) |> success()

    on_exit(fn -> Game.Context.terminate_game(id) end)
    event = Repo.get_by!(ApiAuditEvent, action: "game.create", resource_id: id)
    assert event.api_token_id == nil
    assert event.oauth_connection_id == hd(Oauth.connections(user.id)).id
    assert event.user_id == user.id

    assert %{"game" => %{"id" => ^id, "state" => "canceled"}} =
             conn |> call(client, "cancel_game", %{"id" => id}) |> success()
  end

  test "game creation quota is shared between personal tokens and MCP", %{conn: conn, user: user} do
    client = open_client(conn, user)
    insert(:task, level: "easy")
    {:ok, _, token} = UserApiToken.create(user, %{name: "REST", scopes: ["read", "games:write"]})
    record = UserApiToken.get_active_by_token(token)
    for _ <- 1..5, do: ApiAuditEvent.log!(user.id, record.id, "game.create", "game", 1)
    conn |> call(client, "create_game", %{"level" => "easy", "opponent" => "link"}) |> failure("quota_exceeded")
  end

  test "joins a waiting game; an unrelated user cannot cancel it", %{conn: conn, user: user} do
    host = old_user()
    insert(:task, level: "easy")
    {:ok, game} = Game.Context.create_game(%{players: [host], level: "easy"})
    on_exit(fn -> Game.Context.terminate_game(game.id) end)
    client = open_client(conn, user)
    conn |> call(client, "cancel_game", %{"id" => game.id}) |> failure("not_found")
    assert %{"game" => %{"state" => "playing"}} = conn |> call(client, "join_game", %{"id" => game.id}) |> success()
  end

  test "invites are sent, accepted and canceled with the same participant checks", %{conn: conn, user: user} do
    other = old_user()
    client = open_client(conn, user)
    recipient = open_client(conn, other)
    insert(:task, level: "easy")

    assert %{"invite" => %{"id" => id}} =
             conn |> call(client, "create_invite", %{"recipient_id" => other.id, "level" => "easy"}) |> success()

    stranger = open_client(conn, old_user())
    conn |> call(stranger, "accept_invite", %{"id" => id}) |> failure("not_found")
    assert %{"invite" => %{"game_id" => game_id}} = conn |> call(recipient, "accept_invite", %{"id" => id}) |> success()
    on_exit(fn -> Game.Context.terminate_game(game_id) end)
    another = old_user()

    assert %{"invite" => %{"id" => cancel_id}} =
             conn |> call(client, "create_invite", %{"recipient_id" => another.id, "level" => "easy"}) |> success()

    assert %{"invite" => %{"state" => "canceled"}} =
             conn |> call(client, "cancel_invite", %{"id" => cancel_id}) |> success()
  end

  test "private tournament lifecycle and membership follow Public API restrictions", %{conn: conn, user: user} do
    client = open_client(conn, user)

    assert %{"tournament" => %{"id" => id, "access_type" => "token", "access_token" => access}} =
             conn |> call(client, "create_tournament", tournament_body()) |> success()

    assert %{"tournament" => %{"name" => "Renamed cup", "access_token" => ^access}} =
             conn |> call(client, "update_tournament", %{"id" => id, "name" => "Renamed cup"}) |> success()

    assert %{"tournament" => %{"id" => ^id}} = conn |> call(client, "get_tournament", %{"id" => id}) |> success()

    assert %{"ranking" => _} =
             conn |> call(client, "get_tournament_ranking", %{"id" => id, "page" => 1, "page_size" => 10}) |> success()

    stranger = open_client(conn, old_user())
    conn |> call(stranger, "get_tournament", %{"id" => id}) |> failure("not_found")
    conn |> call(stranger, "update_tournament", %{"id" => id, "name" => "Stolen cup"}) |> failure("not_found")
    conn |> call(stranger, "start_tournament", %{"id" => id}) |> failure("not_found")
    conn |> call(stranger, "cancel_tournament", %{"id" => id}) |> failure("not_found")
    conn |> call(stranger, "join_tournament", %{"id" => id}) |> failure("not_found")

    assert %{"tournament" => %{"joined" => true}} =
             conn |> call(stranger, "join_tournament", %{"id" => id, "access_token" => access}) |> success()

    assert %{"tournament" => %{"joined" => false}} =
             conn |> call(stranger, "leave_tournament", %{"id" => id}) |> success()

    conn |> call(client, "join_tournament", %{"id" => id}) |> success()
    conn |> call(stranger, "join_tournament", %{"id" => id, "access_token" => access}) |> success()
    conn |> call(client, "start_tournament", %{"id" => id}) |> success()
    conn |> call(stranger, "leave_tournament", %{"id" => id}) |> failure("validation_failed")
    conn |> call(client, "cancel_tournament", %{"id" => id}) |> success()
    assert Repo.get_by!(ApiAuditEvent, action: "tournament.create", resource_id: id).oauth_connection_id
  end

  test "write kill switch blocks each mutation while reads and discovery still work", %{conn: conn, user: user} do
    client = open_client(conn, user)
    FunWithFlags.enable(:public_api_writes_disabled)
    on_exit(fn -> FunWithFlags.disable(:public_api_writes_disabled) end)

    for tool <- Tools.all(), tool.method != "GET" do
      assert conn |> call(client, tool.name) |> json_response(503)
    end

    conn |> call(client, "get_me") |> success()
    assert conn |> rpc(client, "tools/list", %{}) |> json_response(200)
    assert Repo.aggregate(ApiAuditEvent, :count) == 0
  end

  test "rejects unknown fields, invalid types and out-of-range arguments before effects", %{conn: conn, user: user} do
    client = open_client(conn, user)

    for {name, args} <- [
          {"create_game", %{"opponent" => "link", "admin" => true}},
          {"create_game", %{"opponent" => "link", "timeout_seconds" => 3601}},
          {"join_game", %{"id" => "1"}},
          {"join_game", %{"id" => 0}},
          {"get_me", %{"user_id" => 123}},
          {"create_tournament", %{}}
        ] do
      conn |> call(client, name, args) |> failure("validation_failed")
    end

    assert Repo.aggregate(ApiAuditEvent, :count) == 0
  end

  test "a games-only connection can act without a read scope", %{conn: conn, user: user} do
    client = open_client(conn, user, ["games:write"])
    insert(:task, level: "easy")

    assert %{"game" => %{"id" => id}} =
             conn |> call(client, "create_game", %{"level" => "easy", "opponent" => "link"}) |> success()

    on_exit(fn -> Game.Context.terminate_game(id) end)
    assert conn |> call(client, "get_me") |> json_response(403)
  end

  test "long polling does not block other MCP requests and unsubscribes after returning", %{conn: conn, user: user} do
    client = open_client(conn, user)
    %{"version" => version} = conn |> call(client, "list_invites") |> success()
    owner = self()

    waiter =
      Task.async(fn ->
        send(owner, :waiting)
        call(conn, client, "list_invites", %{"version" => version, "wait" => 6})
      end)

    assert_receive :waiting
    conn |> call(client, "get_me") |> success()
    # A duration beyond Hermes' five-second call timeout must still complete.
    assert waiter |> Task.await(10_000) |> success() |> Map.fetch!("invites") == []
  end
end
