defmodule CodebattleWeb.PublicApi.V1.EventsTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Game
  alias Codebattle.Invite
  alias Codebattle.Tournament
  alias Codebattle.UserApiToken
  alias CodebattleWeb.PublicApi.V1.EventController

  setup do
    Application.put_env(:codebattle, :public_api_events, lifetime_ms: 1500, ping_ms: 400)
    on_exit(fn -> Application.delete_env(:codebattle, :public_api_events) end)
  end

  defp old_user, do: insert(:user, inserted_at: NaiveDateTime.add(NaiveDateTime.utc_now(), -30, :day))

  defp token(user) do
    {:ok, _record, token} = UserApiToken.create(user, %{name: "test", scopes: ["read"], expires_in_days: 30})
    token
  end

  # Opens the stream in another process, waits until it listens, runs `fun`, then returns the
  # finished response and its parsed events once the (short, test) lifetime runs out.
  defp stream(conn, user, fun \\ fn -> :ok end) do
    token = token(user)
    before = EventController.open_streams(user.id)

    task =
      Task.async(fn ->
        conn
        |> put_req_header("authorization", "Bearer " <> token)
        |> put_req_header("accept", "text/event-stream")
        |> get("/public_api/v1/me/events")
      end)

    wait_until(fn -> EventController.open_streams(user.id) > before end)
    fun.()
    conn = Task.await(task, 5000)
    {conn, parse(conn.resp_body)}
  end

  defp wait_until(check, attempts \\ 200) do
    cond do
      check.() -> :ok
      attempts == 0 -> flunk("stream did not open")
      true -> Process.sleep(10) && wait_until(check, attempts - 1)
    end
  end

  defp parse(body) do
    body
    |> String.split("\n\n", trim: true)
    |> Enum.flat_map(fn block ->
      fields =
        for line <- String.split(block, "\n"), [k, v] <- [String.split(line, ": ", parts: 2)], into: %{}, do: {k, v}

      case fields do
        %{"event" => name, "data" => data} -> [{name, Jason.decode!(data)}]
        _ -> []
      end
    end)
  end

  defp names(events), do: Enum.map(events, &elem(&1, 0))

  test "hello snapshot, invites as they happen, pings and a bye", %{conn: conn} do
    user = old_user()
    friend = old_user()

    {conn, events} = stream(conn, user, fn -> {:ok, _} = Invite.Actions.create(friend, %{recipient_id: user.id}) end)

    assert conn.status == 200
    assert conn |> get_resp_header("content-type") |> hd() =~ "text/event-stream"
    assert get_resp_header(conn, "x-accel-buffering") == ["no"]
    assert conn.resp_body =~ "retry: 3000"
    assert conn.resp_body =~ ": ping"

    assert [{"hello", hello} | _] = events

    assert %{"user" => %{"id" => id}, "active_game" => nil, "invites" => [], "tournaments" => [], "server_time" => _} =
             hello

    assert id == user.id

    assert {"invite.created", %{"invite" => %{"direction" => "incoming", "creator" => %{"name" => name}}}} =
             List.keyfind(events, "invite.created", 0)

    assert name == friend.name
    assert List.last(names(events)) == "bye"
  end

  test "games: started on join for the waiting creator, then canceled", %{conn: conn} do
    insert(:task, level: "easy")
    user = old_user()
    opponent = old_user()

    {_conn, events} =
      stream(conn, user, fn ->
        {:ok, game} = Game.Context.create_game(%{state: "waiting_opponent", level: "easy", players: [user]})
        {:ok, _} = Game.Context.join_game(game.id, opponent)
        game |> Map.put(:is_live, true) |> Game.Engine.terminate_game()
      end)

    assert ["hello", "game.created", "game.started", "game.canceled", "bye"] =
             events |> names() |> Enum.reject(&(&1 == "ping"))

    {"game.started", %{"game" => game}} = List.keyfind(events, "game.started", 0)
    assert game["state"] == "playing" and length(game["players"]) == 2
  end

  test "tournaments: the player and the creator hear about joins and the cancel", %{conn: conn} do
    creator = old_user()
    player = old_user()
    starts_at = Calendar.strftime(DateTime.add(DateTime.utc_now(), 1, :hour), "%Y-%m-%dT%H:%M")

    {:ok, tournament} =
      Tournament.Context.create(%{
        "creator" => creator,
        "name" => "Events cup",
        "description" => "stream test",
        "starts_at" => starts_at,
        "type" => "swiss",
        "players_limit" => 8
      })

    creator_task =
      Task.async(fn -> stream(conn, creator) end)

    wait_until(fn -> EventController.open_streams(creator.id) == 1 end)

    {_conn, player_events} =
      stream(conn, player, fn ->
        Tournament.Server.handle_event(tournament.id, :join, %{user: player})
        Tournament.Context.handle_event(tournament.id, :cancel, %{user: creator})
      end)

    {_conn, creator_events} = Task.await(creator_task, 5000)

    assert {"tournament.joined", %{"tournament" => %{"id" => id}}} = List.keyfind(player_events, "tournament.joined", 0)
    assert id == tournament.id
    assert List.keyfind(player_events, "tournament.canceled", 0)

    assert {"tournament.player_joined", %{"player" => %{"id" => player_id}}} =
             List.keyfind(creator_events, "tournament.player_joined", 0)

    assert player_id == player.id
    assert List.keyfind(creator_events, "tournament.canceled", 0)
  end

  test "at most two streams per user", %{conn: conn} do
    user = old_user()
    token = token(user)

    first = Task.async(fn -> stream(conn, user) end)
    wait_until(fn -> EventController.open_streams(user.id) == 1 end)
    second = Task.async(fn -> stream(conn, user) end)
    wait_until(fn -> EventController.open_streams(user.id) == 2 end)

    assert %{"error" => %{"code" => "rate_limited"}} =
             conn
             |> put_req_header("authorization", "Bearer " <> token)
             |> get("/public_api/v1/me/events")
             |> json_response(429)

    Task.await(first, 5000)
    Task.await(second, 5000)
  end
end
