defmodule CodebattleWeb.PublicApi.V1.PublicApiTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.UserApiToken

  defp old_user, do: insert(:user, inserted_at: NaiveDateTime.add(NaiveDateTime.utc_now(), -30, :day))

  defp token(user, scopes \\ ["read"]) do
    {:ok, _record, token} = UserApiToken.create(user, %{name: "test", scopes: scopes, expires_in_days: 30})
    token
  end

  defp api(conn, token), do: put_req_header(conn, "authorization", "Bearer " <> token)

  describe "tokens" do
    test "stores only the hash and dies with the account", %{conn: _conn} do
      user = old_user()
      token = token(user)

      assert %UserApiToken{} = active = UserApiToken.get_active_by_token(token)
      refute active.token_hash == token
      assert active.token_prefix == String.slice(token, 0, 12)

      UserApiToken.revoke_all(user.id)
      assert UserApiToken.get_active_by_token(token) == nil
    end

    test "write scopes need an older account and an expiry" do
      assert {:error, :scope_not_allowed} =
               UserApiToken.create(insert(:user), %{name: "t", scopes: ["games:write"], expires_in_days: 30})

      assert {:error, :write_tokens_must_expire} =
               UserApiToken.create(old_user(), %{name: "t", scopes: ["games:write"], expires_in_days: "never"})
    end

    test "banned users can't authenticate", %{conn: conn} do
      user = old_user()
      token = token(user)
      user |> Ecto.Changeset.change(subscription_type: :banned) |> Codebattle.Repo.update!()

      conn |> api(token) |> get("/public_api/v1/me") |> json_response(401)
    end
  end

  describe "auth" do
    test "requires a valid token and the right scope", %{conn: conn} do
      user = old_user()
      read_token = token(user)

      assert %{"error" => %{"code" => "unauthorized"}} = conn |> get("/public_api/v1/me") |> json_response(401)

      assert %{"error" => %{"code" => "invalid_token"}} =
               conn |> api("cbp_nope") |> get("/public_api/v1/me") |> json_response(401)

      assert %{"user" => %{"id" => id}} = conn |> api(read_token) |> get("/public_api/v1/me") |> json_response(200)
      assert id == user.id

      assert %{"error" => %{"code" => "insufficient_scope"}} =
               conn
               |> api(read_token)
               |> post("/public_api/v1/games", %{level: "easy", opponent: "bot"})
               |> json_response(403)
    end
  end

  describe "games" do
    test "creates a bot game and shows it as the active game", %{conn: conn} do
      insert(:task, level: "easy")
      user = old_user()
      token = token(user, ["read", "games:write"])

      assert %{"game" => nil} = conn |> api(token) |> get("/public_api/v1/me/active_game") |> json_response(200)

      assert %{"game" => %{"id" => game_id}} =
               conn
               |> api(token)
               |> post("/public_api/v1/games", %{level: "easy", opponent: "bot", timeout_seconds: 300})
               |> json_response(201)

      on_exit(fn -> Game.Context.terminate_game(game_id) end)

      assert %{"game" => %{"id" => ^game_id, "ends_at" => ends_at}, "server_time" => _} =
               conn |> api(token) |> get("/public_api/v1/me/active_game") |> json_response(200)

      assert is_binary(ends_at)

      assert %{"error" => %{"code" => "validation_failed", "details" => %{"task_id" => _}}} =
               conn
               |> api(token)
               |> post("/public_api/v1/games", %{level: "easy", opponent: "bot", task_id: 1})
               |> json_response(422)
    end
  end

  describe "tournaments" do
    test "creates a private open tournament visible only to related users", %{conn: conn} do
      user = old_user()
      token = token(user, ["read", "tournaments:write"])
      starts_at = DateTime.utc_now() |> DateTime.add(1, :day) |> DateTime.to_iso8601()
      body = %{name: "API cup", description: "made by a bot", starts_at: starts_at, level: "easy", rounds_limit: 2}

      assert %{"error" => %{"details" => %{"grade" => "is not allowed"}}} =
               conn
               |> api(token)
               |> post("/public_api/v1/tournaments", Map.put(body, :grade, "grand_slam"))
               |> json_response(422)

      assert %{"tournament" => %{"id" => id} = card} =
               conn |> api(token) |> post("/public_api/v1/tournaments", body) |> json_response(201)

      assert %{"access_type" => "token", "grade" => "open", "access_token" => access_token, "invite_url" => _} = card

      stored = Tournament.Context.get_from_db!(id)
      assert stored.grade == "open" and stored.task_provider == "level" and stored.creator_id == user.id

      # editing keeps the invite link alive
      assert %{"tournament" => %{"name" => "API cup 2", "access_token" => ^access_token}} =
               conn |> api(token) |> patch("/public_api/v1/tournaments/#{id}", %{name: "API cup 2"}) |> json_response(200)

      stranger_token = token(old_user())

      assert %{"error" => %{"code" => "not_found"}} =
               conn |> api(stranger_token) |> get("/public_api/v1/tournaments/#{id}") |> json_response(404)

      assert %{"tournaments" => schedule} =
               conn |> api(stranger_token) |> get("/public_api/v1/tournaments/schedule") |> json_response(200)

      refute Enum.any?(schedule, &(&1["id"] == id))
    end
  end
end
