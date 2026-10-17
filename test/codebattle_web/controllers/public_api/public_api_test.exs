defmodule CodebattleWeb.PublicApi.V1.PublicApiTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Game
  alias Codebattle.Invite.Actions
  alias Codebattle.Tournament
  alias Codebattle.UserApiToken

  defp old_user, do: insert(:user, inserted_at: NaiveDateTime.add(NaiveDateTime.utc_now(), -30, :day))

  defp token(user, scopes \\ ["read"]) do
    {:ok, _record, token} = UserApiToken.create(user, %{name: "test", scopes: scopes, expires_in_days: 30})
    token
  end

  defp api(conn, token) do
    conn
    |> put_req_header("authorization", "Bearer " <> token)
    |> put_req_header("content-type", "application/json")
  end

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

  describe "live games" do
    test "a link game waiting for an opponent is the active game", %{conn: conn} do
      insert(:task, level: "easy")
      token = token(old_user(), ["read", "games:write"])

      assert %{"game" => %{"id" => game_id, "state" => "waiting_opponent", "join_url" => join_url, "players" => [player]}} =
               conn
               |> api(token)
               |> post("/public_api/v1/games", %{level: "easy", opponent: "link"})
               |> json_response(201)

      on_exit(fn -> Game.Context.terminate_game(game_id) end)

      assert join_url =~ "/games/#{game_id}"
      assert %{"result" => nil, "is_bot" => false} = player

      assert %{"game" => %{"id" => ^game_id, "state" => "waiting_opponent", "task" => %{"name" => _}}} =
               conn |> api(token) |> get("/public_api/v1/me/active_game") |> json_response(200)
    end

    test "lists lobby games and joins one that waits for an opponent", %{conn: conn} do
      insert(:task, level: "easy")
      host = insert(:user)
      {:ok, waiting} = Game.Context.create_game(%{players: [host], level: "easy"})
      on_exit(fn -> Game.Context.terminate_game(waiting.id) end)

      {:ok, hidden} = Game.Context.create_game(%{players: [insert(:user)], level: "easy", visibility_type: "hidden"})
      on_exit(fn -> Game.Context.terminate_game(hidden.id) end)

      user = old_user()
      token = token(user, ["read", "games:write"])

      assert %{"games" => games, "server_time" => _} =
               conn |> api(token) |> get("/public_api/v1/games/live") |> json_response(200)

      assert [%{"state" => "waiting_opponent", "task" => nil, "players" => [%{"name" => name}]}] =
               Enum.filter(games, &(&1["id"] == waiting.id))

      assert name == host.name
      refute Enum.any?(games, &(&1["id"] == hidden.id))

      assert %{"game" => %{"id" => game_id, "state" => "playing", "task" => %{"id" => _}, "players" => players}} =
               conn |> api(token) |> post("/public_api/v1/games/#{waiting.id}/join") |> json_response(200)

      assert game_id == waiting.id
      assert Enum.map(players, & &1["id"]) == [host.id, user.id]
      assert Enum.all?(players, &is_nil(&1["result"]))

      other_token = token(old_user(), ["read", "games:write"])

      assert %{"error" => %{"message" => "The game is not waiting for an opponent"}} =
               conn |> api(other_token) |> post("/public_api/v1/games/#{waiting.id}/join") |> json_response(422)

      assert conn |> api(other_token) |> post("/public_api/v1/games/999999999/join") |> json_response(404)
      assert conn |> api(token(old_user())) |> post("/public_api/v1/games/#{hidden.id}/join") |> json_response(403)
    end

    test "lists only open games and names the game that blocks a join", %{conn: conn} do
      insert(:task, level: "easy")
      {:ok, waiting} = Game.Context.create_game(%{players: [insert(:user)], level: "easy"})
      on_exit(fn -> Game.Context.terminate_game(waiting.id) end)

      user = old_user()
      {:ok, own} = Game.Context.create_game(%{players: [user], level: "easy"})
      on_exit(fn -> Game.Context.terminate_game(own.id) end)
      token = token(user, ["read", "games:write"])
      waiting_id = waiting.id
      own_id = own.id

      assert %{"games" => open} =
               conn |> api(token) |> get("/public_api/v1/games/live?state=waiting_opponent") |> json_response(200)

      assert Enum.all?(open, &(&1["state"] == "waiting_opponent"))
      assert Enum.any?(open, &(&1["id"] == waiting_id))

      assert %{"games" => playing} =
               conn |> api(token) |> get("/public_api/v1/games/live?state=playing") |> json_response(200)

      refute Enum.any?(playing, &(&1["id"] == waiting_id))

      assert %{"error" => %{"code" => "validation_failed", "details" => %{"state" => _}}} =
               conn |> api(token) |> get("/public_api/v1/games/live?state=finished") |> json_response(422)

      assert %{"error" => %{"details" => %{"reason" => "already_in_a_game", "active_game_id" => ^own_id}}} =
               conn |> api(token) |> post("/public_api/v1/games/#{waiting_id}/join") |> json_response(422)

      assert %{"error" => %{"details" => %{"reason" => "already_joined", "active_game_id" => ^own_id}}} =
               conn |> api(token) |> post("/public_api/v1/games/#{own_id}/join") |> json_response(422)
    end
  end

  describe "tasks" do
    test "lists only tasks the user may play, narrowed by level, tags and name", %{conn: conn} do
      user = old_user()
      token = token(user)
      other = insert(:user)

      public = insert(:task, name: "minimal_time_partition", level: "medium", tags: ["math"])
      insert(:task, name: "string_reverse", level: "medium", tags: ["strings"])
      insert(:task, name: "easy_sum", level: "easy")
      own_hidden = insert(:task, name: "my_draft", level: "medium", visibility: "hidden", creator_id: user.id)
      insert(:task, name: "someone_elses", level: "medium", visibility: "hidden", creator_id: other.id)
      insert(:task, name: "disabled_one", level: "medium", state: "disabled")

      names = fn query ->
        conn
        |> api(token)
        |> get("/public_api/v1/tasks", query)
        |> json_response(200)
        |> Map.fetch!("tasks")
        |> Enum.map(& &1["name"])
      end

      assert names.(%{level: "medium"}) == ["minimal_time_partition", "my_draft", "string_reverse"]
      assert names.(%{level: "medium", tags: "math,collections"}) == ["minimal_time_partition"]
      assert names.(%{name: "PARTITION"}) == ["minimal_time_partition"]
      assert names.(%{name: "%"}) == []

      assert %{"tasks" => [task]} =
               conn |> api(token) |> get("/public_api/v1/tasks", %{name: "my_draft"}) |> json_response(200)

      assert %{"id" => id, "visibility" => "hidden", "level" => "medium", "url" => _} = task
      assert id == own_hidden.id
      assert public.id in Enum.map(json_response(get(api(conn, token), "/public_api/v1/tasks"), 200)["tasks"], & &1["id"])

      assert %{"error" => %{"details" => %{"level" => _}}} =
               conn |> api(token) |> get("/public_api/v1/tasks", %{level: "insane"}) |> json_response(422)
    end

    test "creates a game on a task by name or id, only if the user may play it", %{conn: conn} do
      user = old_user()
      token = token(user, ["read", "games:write"])
      task = insert(:task, name: "minimal_time_partition", level: "medium")
      hidden = insert(:task, level: "medium", visibility: "hidden", creator_id: insert(:user).id)

      assert %{"error" => %{"details" => %{"task_id" => "no such task"}}} =
               conn
               |> api(token)
               |> post("/public_api/v1/games", %{task_id: hidden.id, opponent: "bot"})
               |> json_response(422)

      assert %{"error" => %{"details" => %{"task_name" => "no such task"}}} =
               conn
               |> api(token)
               |> post("/public_api/v1/games", %{task_name: hidden.name, opponent: "bot"})
               |> json_response(422)

      assert %{"error" => %{"details" => %{"level" => "does not match the task level (medium)"}}} =
               conn
               |> api(token)
               |> post("/public_api/v1/games", %{task_id: task.id, level: "easy", opponent: "bot"})
               |> json_response(422)

      assert %{"error" => %{"details" => %{"level" => _}}} =
               conn |> api(token) |> post("/public_api/v1/games", %{opponent: "bot"}) |> json_response(422)

      assert %{"game" => %{"id" => game_id}} =
               conn
               |> api(token)
               |> post("/public_api/v1/games", %{task_name: "minimal_time_partition", opponent: "bot"})
               |> json_response(201)

      on_exit(fn -> Game.Context.terminate_game(game_id) end)

      assert %{"game" => %{"task" => %{"id" => task_id, "level" => "medium"}}} =
               conn |> api(token) |> get("/public_api/v1/me/active_game") |> json_response(200)

      assert task_id == task.id
    end

    test "invites carry a task the creator may play", %{conn: conn} do
      creator = old_user()
      recipient = old_user()
      token = token(creator, ["read", "games:write"])
      task = insert(:task, level: "hard")
      hidden = insert(:task, level: "hard", visibility: "hidden", creator_id: recipient.id)

      assert %{"error" => %{"details" => %{"task_id" => "no such task"}}} =
               conn
               |> api(token)
               |> post("/public_api/v1/invites", %{recipient_id: recipient.id, task_id: hidden.id})
               |> json_response(422)

      assert {:error, :task_not_found} =
               Actions.create(creator, %{recipient_id: recipient.id, task_id: hidden.id})

      assert %{"invite" => %{"task_id" => task_id, "level" => "hard"}} =
               conn
               |> api(token)
               |> post("/public_api/v1/invites", %{recipient_id: recipient.id, task_id: task.id})
               |> json_response(201)

      assert task_id == task.id
    end
  end

  describe "invites" do
    test "invite by name, see it on both sides, accept into a game", %{conn: conn} do
      insert(:task, level: "easy")
      creator = old_user()
      recipient = old_user()
      creator_token = token(creator, ["read", "games:write"])
      recipient_token = token(recipient, ["read", "games:write"])

      assert %{"invite" => %{"id" => id, "direction" => "outgoing", "state" => "pending", "level" => "easy"}} =
               conn
               |> api(creator_token)
               |> post("/public_api/v1/invites", %{recipient_name: recipient.name, level: "easy"})
               |> json_response(201)

      assert %{"invites" => [%{"id" => ^id, "direction" => "incoming", "creator" => %{"name" => name}}]} =
               conn |> api(recipient_token) |> get("/public_api/v1/me/invites") |> json_response(200)

      assert name == creator.name

      # strangers can't touch it
      stranger_token = token(old_user(), ["read", "games:write"])
      assert conn |> api(stranger_token) |> post("/public_api/v1/invites/#{id}/accept") |> json_response(404)
      # the creator can't accept their own invite
      assert conn |> api(creator_token) |> post("/public_api/v1/invites/#{id}/accept") |> json_response(404)

      assert %{"invite" => %{"state" => "accepted", "game_id" => game_id, "game_url" => _}} =
               conn |> api(recipient_token) |> post("/public_api/v1/invites/#{id}/accept") |> json_response(200)

      on_exit(fn -> Game.Context.terminate_game(game_id) end)

      assert %{"game" => %{"id" => ^game_id}} =
               conn |> api(creator_token) |> get("/public_api/v1/me/active_game") |> json_response(200)
    end

    test "either side cancels; invalid recipients are explained", %{conn: conn} do
      creator = old_user()
      recipient = old_user()
      token = token(creator, ["read", "games:write"])

      assert %{"error" => %{"details" => %{"recipient" => "can't invite yourself"}}} =
               conn |> api(token) |> post("/public_api/v1/invites", %{recipient_id: creator.id}) |> json_response(422)

      assert %{"error" => %{"details" => %{"recipient_name" => "no such user"}}} =
               conn
               |> api(token)
               |> post("/public_api/v1/invites", %{recipient_name: "nobody-here"})
               |> json_response(422)

      assert %{"invite" => %{"id" => id}} =
               conn |> api(token) |> post("/public_api/v1/invites", %{recipient_id: recipient.id}) |> json_response(201)

      assert %{"error" => %{"message" => message}} =
               conn |> api(token) |> post("/public_api/v1/invites", %{recipient_id: recipient.id}) |> json_response(422)

      assert message =~ "already a pending invite"

      recipient_token = token(recipient, ["read", "games:write"])

      assert %{"invite" => %{"state" => "canceled"}} =
               conn |> api(recipient_token) |> post("/public_api/v1/invites/#{id}/cancel") |> json_response(200)

      assert %{"invites" => []} = conn |> api(token) |> get("/public_api/v1/me/invites") |> json_response(200)
    end

    test "long polling returns at once on a stale version and wakes up on an invite", %{conn: conn} do
      creator = old_user()
      recipient = old_user()
      token = token(recipient)

      assert %{"invites" => [], "version" => version} =
               conn |> api(token) |> get("/public_api/v1/me/invites") |> json_response(200)

      assert %{"error" => %{"details" => %{"wait" => _}}} =
               conn |> api(token) |> get("/public_api/v1/me/invites", %{wait: "120"}) |> json_response(422)

      Task.start(fn ->
        Process.sleep(200)
        Actions.create(creator, %{recipient_id: recipient.id})
      end)

      started = System.monotonic_time(:millisecond)

      assert %{"invites" => [%{"direction" => "incoming"}], "version" => new_version} =
               conn
               |> api(token)
               |> get("/public_api/v1/me/invites", %{wait: "5", version: version})
               |> json_response(200)

      assert System.monotonic_time(:millisecond) - started < 4000
      refute new_version == version

      # a version that is already stale answers immediately
      assert %{"invites" => [_]} =
               conn
               |> api(token)
               |> get("/public_api/v1/me/invites", %{wait: "30", version: version})
               |> json_response(200)
    end
  end

  describe "users/online" do
    test "lists online registered users with their busiest state", %{conn: conn} do
      user = old_user()
      friend = insert(:user, rating: 1600)
      token = token(user)

      # two tabs: the lobby and a game
      {:ok, _} = CodebattleWeb.Presence.track(self(), "main", friend.id, %{user: friend, state: "lobby", link: nil})
      tab = spawn(fn -> Process.sleep(:infinity) end)
      {:ok, _} = CodebattleWeb.Presence.track(tab, "main", friend.id, %{user: friend, state: "playing", link: "/games/7"})

      assert %{"users" => users} = conn |> api(token) |> get("/public_api/v1/users/online") |> json_response(200)

      assert [%{"id" => id, "state" => "playing", "url" => url}] = Enum.filter(users, &(&1["id"] == friend.id))
      assert id == friend.id and url =~ "/games/7"
    end
  end

  describe "validation errors" do
    test "the message names each failed field", %{conn: conn} do
      user = old_user()
      token = token(user, ["read", "tournaments:write"])
      past = DateTime.utc_now() |> DateTime.add(-1, :minute) |> DateTime.to_iso8601()

      assert %{"error" => %{"message" => message, "details" => details}} =
               conn
               |> api(token)
               |> post("/public_api/v1/tournaments", %{name: "API cup", starts_at: past, level: "easy", color: "red"})
               |> json_response(422)

      assert message == "Invalid parameters: color is not allowed; starts_at must be in the future"
      assert details == %{"color" => "is not allowed", "starts_at" => "must be in the future"}
    end
  end

  describe "request bodies" do
    test "a JSON body without the JSON content type gets a clear 415", %{conn: conn} do
      user = old_user()
      token = token(user, ["read", "tournaments:write"])
      body = Jason.encode!(%{name: "API cup", description: "x", level: "easy"})

      assert %{"error" => %{"code" => "unsupported_media_type", "message" => message}} =
               conn
               |> api(token)
               |> put_req_header("content-type", "application/x-www-form-urlencoded")
               |> post("/public_api/v1/tournaments", body)
               |> json_response(415)

      assert message =~ "Content-Type: application/json"
    end
  end

  describe "me/games" do
    test "pages by cursor and narrows by from/to", %{conn: conn} do
      user = old_user()
      token = token(user)

      [old, mid, new] =
        for days_ago <- [10, 5, 1] do
          insert(:game,
            state: "game_over",
            player_ids: [user.id],
            starts_at: NaiveDateTime.add(NaiveDateTime.utc_now(), -days_ago, :day)
          )
        end

      ids = fn query ->
        conn
        |> api(token)
        |> get("/public_api/v1/me/games", query)
        |> json_response(200)
        |> Map.fetch!("games")
        |> Enum.map(& &1["id"])
      end

      assert ids.(%{}) == [new.id, mid.id, old.id]
      assert ids.(%{cursor: mid.id}) == [old.id]

      from = Date.to_iso8601(Date.add(Date.utc_today(), -7))
      to = DateTime.to_iso8601(DateTime.add(DateTime.utc_now(), -2, :day))
      assert ids.(%{from: from, to: to}) == [mid.id]

      assert %{"error" => %{"code" => "validation_failed", "details" => %{"from" => _}}} =
               conn |> api(token) |> get("/public_api/v1/me/games", %{from: "yesterday"}) |> json_response(422)
    end
  end

  describe "tournaments/live" do
    test "lists live public and related private tournaments regardless of starts_at", %{conn: conn} do
      user = old_user()
      token = token(user)
      long_ago = DateTime.add(DateTime.utc_now(:second), -3, :day)

      public = insert(:tournament, state: "waiting_participants", access_type: "public", starts_at: long_ago)
      mine = insert(:token_tournament, state: "active", creator_id: user.id, starts_at: long_ago)
      _foreign = insert(:token_tournament, state: "waiting_participants", starts_at: long_ago)
      _finished = insert(:tournament, state: "finished", access_type: "public")

      ids =
        conn
        |> api(token)
        |> get("/public_api/v1/tournaments/live")
        |> json_response(200)
        |> Map.fetch!("tournaments")
        |> Enum.map(& &1["id"])

      assert ids == [mine.id, public.id]
    end
  end

  describe "joined bot game" do
    test "a game joined from the lobby is the active game and lands in history", %{conn: conn} do
      insert(:task, level: "easy")
      user = old_user()
      token = token(user, ["read"])

      {:ok, game} =
        Game.Context.create_game(%{
          state: "waiting_opponent",
          type: "duo",
          mode: "standard",
          visibility_type: "public",
          level: "easy",
          players: [Codebattle.Bot.Context.build()]
        })

      on_exit(fn -> Game.Context.terminate_game(game.id) end)

      {:ok, _} = Game.Context.join_game(game.id, user)
      game_id = game.id

      assert %{"game" => %{"id" => ^game_id}} =
               conn |> api(token) |> get("/public_api/v1/me/active_game") |> json_response(200)
    end
  end

  describe "tournaments" do
    test "creates a private open tournament visible only to related users", %{conn: conn} do
      user = old_user()
      token = token(user, ["read", "tournaments:write"])
      starts_at = :second |> DateTime.utc_now() |> DateTime.add(1, :day) |> DateTime.add(23, :second)

      body = %{
        name: "API cup",
        description: "made by a bot",
        starts_at: DateTime.to_iso8601(starts_at),
        level: "easy",
        rounds_limit: 2
      }

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
      # seconds survive: the UI form's minute precision doesn't apply to the API
      assert DateTime.compare(stored.starts_at, starts_at) == :eq

      # editing keeps the invite link alive
      assert %{"tournament" => %{"name" => "API cup 2", "access_token" => ^access_token}} =
               conn |> api(token) |> patch("/public_api/v1/tournaments/#{id}", %{name: "API cup 2"}) |> json_response(200)

      assert DateTime.compare(Tournament.Context.get_from_db!(id).starts_at, starts_at) == :eq

      stranger_token = token(old_user())

      assert %{"error" => %{"code" => "not_found"}} =
               conn |> api(stranger_token) |> get("/public_api/v1/tournaments/#{id}") |> json_response(404)

      assert %{"tournaments" => schedule} =
               conn |> api(stranger_token) |> get("/public_api/v1/tournaments/schedule") |> json_response(200)

      refute Enum.any?(schedule, &(&1["id"] == id))
    end

    test "joins and leaves tournaments, private ones only with the invite's access_token", %{conn: conn} do
      creator = old_user()
      user = old_user()
      token = token(user, ["read", "games:write"])
      starts_at = Calendar.strftime(DateTime.add(DateTime.utc_now(), 1, :hour), "%Y-%m-%dT%H:%M")

      create = fn attrs ->
        {:ok, tournament} =
          %{
            "creator" => creator,
            "name" => "Join cup",
            "description" => "join test",
            "starts_at" => starts_at,
            "type" => "swiss",
            "players_limit" => 8
          }
          |> Map.merge(attrs)
          |> Tournament.Context.create()

        tournament
      end

      public = create.(%{"access_type" => "public"})
      private = create.(%{"access_type" => "token"})

      assert %{"error" => %{"code" => "insufficient_scope"}} =
               conn |> api(token(user)) |> post("/public_api/v1/tournaments/#{public.id}/join") |> json_response(403)

      assert %{"tournament" => %{"joined" => true}} =
               conn |> api(token) |> post("/public_api/v1/tournaments/#{public.id}/join") |> json_response(200)

      assert Tournament.Helpers.player?(Tournament.Context.get!(public.id), user.id)

      # idempotent
      assert %{"tournament" => %{"joined" => true}} =
               conn |> api(token) |> post("/public_api/v1/tournaments/#{public.id}/join") |> json_response(200)

      assert %{"tournament" => %{"joined" => true}} =
               conn |> api(token) |> get("/public_api/v1/tournaments/#{public.id}") |> json_response(200)

      assert %{"tournament" => %{"joined" => false}} =
               conn |> api(token) |> post("/public_api/v1/tournaments/#{public.id}/leave") |> json_response(200)

      refute Tournament.Helpers.player?(Tournament.Context.get!(public.id), user.id)

      assert %{"error" => %{"code" => "not_found"}} =
               conn |> api(token) |> post("/public_api/v1/tournaments/#{private.id}/join") |> json_response(404)

      assert %{"error" => %{"code" => "not_found"}} =
               conn
               |> api(token)
               |> post("/public_api/v1/tournaments/#{private.id}/join", %{access_token: "wrong"})
               |> json_response(404)

      assert %{"tournament" => %{"joined" => true} = card} =
               conn
               |> api(token)
               |> post("/public_api/v1/tournaments/#{private.id}/join", %{access_token: private.access_token})
               |> json_response(200)

      refute Map.has_key?(card, "access_token")

      Tournament.Context.handle_event(private.id, :start, %{user: creator})

      assert %{"error" => %{"details" => %{"reason" => "already_started"}}} =
               conn |> api(token) |> post("/public_api/v1/tournaments/#{private.id}/leave") |> json_response(422)

      Tournament.Context.handle_event(private.id, :cancel, %{user: creator})
      Tournament.Context.handle_event(public.id, :cancel, %{user: creator})
    end
  end
end
