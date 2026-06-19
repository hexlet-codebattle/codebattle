defmodule CodebattleWeb.TournamentStreamerChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Game.Player
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Match
  alias CodebattleWeb.StreamerSocket
  alias CodebattleWeb.TournamentAdminChannel
  alias CodebattleWeb.TournamentStreamerChannel

  defp create_tournament(creator, attrs \\ %{}) do
    base = %{
      "starts_at" => "2026-02-24T06:00",
      "name" => "Stream Tournament",
      "description" => "Stream Tournament",
      "user_timezone" => "Etc/UTC",
      "level" => "easy",
      "creator" => creator,
      "break_duration_seconds" => 0,
      "type" => "swiss",
      "state" => "waiting_participants",
      "players_limit" => 200
    }

    {:ok, tournament} = Tournament.Context.create(Map.merge(base, attrs))
    tournament
  end

  defp streamer_socket(tournament_id) do
    {:ok, socket} = connect(StreamerSocket, %{"token" => "x-key", "tournament_id" => tournament_id})
    socket
  end

  describe "join/3" do
    test "joins with token-authed socket and returns short tournament state" do
      creator = insert(:user)
      tournament = create_tournament(creator)

      assert {:ok, payload, _socket} =
               subscribe_and_join(
                 streamer_socket(tournament.id),
                 TournamentStreamerChannel,
                 "tournament_streamer",
                 %{}
               )

      assert %{tournament: t, active_game: nil} = payload
      assert t.id == tournament.id
      assert t.name == "Stream Tournament"
      assert t.type == "swiss"
      assert t.state == "waiting_participants"
    end

    test "rejects join when socket is not streamer-authed" do
      socket = socket(StreamerSocket, "streamer_unauth", %{streamer?: false, tournament_id: 1})

      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(
                 socket,
                 TournamentStreamerChannel,
                 "tournament_streamer",
                 %{}
               )
    end

    test "rejects join when tournament does not exist" do
      missing_id = System.unique_integer([:positive])

      assert {:error, %{reason: "not_found"}} =
               subscribe_and_join(
                 streamer_socket(missing_id),
                 TournamentStreamerChannel,
                 "tournament_streamer",
                 %{}
               )
    end
  end

  describe "handle_info/2" do
    setup do
      creator = insert(:user)
      tournament = create_tournament(creator)

      {:ok, _payload, socket} =
        subscribe_and_join(
          streamer_socket(tournament.id),
          TournamentStreamerChannel,
          "tournament_streamer",
          %{}
        )

      %{tournament: tournament, socket: socket}
    end

    test "ignores tournament lifecycle updates", %{socket: socket, tournament: tournament} do
      send(socket.channel_pid, %{
        event: "tournament:updated",
        payload: %{tournament: %{id: tournament.id, name: "x", state: "active", type: "swiss"}}
      })

      send(socket.channel_pid, %{
        event: "tournament:round_created",
        payload: %{tournament: %{id: tournament.id, current_round_position: 1}}
      })

      refute_push("tournament:updated", _)
      refute_push("tournament:round_created", _)
    end

    test "pushes tournament:game:finished on game:tournament:finished", %{socket: socket} do
      payload = %{
        game_id: 42,
        task_id: 7,
        game_state: "game_over",
        game_level: "easy",
        duration_sec: 120,
        player_results: %{1 => %{result: "won"}, 2 => %{result: "lost"}}
      }

      send(socket.channel_pid, %{event: "game:tournament:finished", payload: payload})

      assert_push("tournament:game:finished", ^payload)
    end

    test "forwards check_completed only for the active game", %{socket: socket} do
      :sys.replace_state(socket.channel_pid, fn s ->
        %{s | assigns: Map.put(s.assigns, :active_game_id, 100)}
      end)

      send(socket.channel_pid, %{
        event: "game:check_completed",
        payload: %{game_id: 100, user_id: 1, check_result: %{status: "ok"}}
      })

      assert_push("active_game:check_result", %{game_id: 100})

      send(socket.channel_pid, %{
        event: "game:check_completed",
        payload: %{game_id: 999, user_id: 1, check_result: %{status: "ok"}}
      })

      refute_push("active_game:check_result", %{game_id: 999})
    end

    test "ignores game:finished for non-active game", %{socket: socket} do
      send(socket.channel_pid, %{
        event: "game:finished",
        payload: %{game_id: 12_345, game_state: "game_over"}
      })

      refute_push("active_game:finished", _)
    end

    test "ignores unknown events", %{socket: socket} do
      send(socket.channel_pid, %{event: "tournament:totally:unknown", payload: %{}})

      refute_push("tournament:totally:unknown", _)
    end

    test "auto-selects rematch for the active pair" do
      creator = insert(:user)
      player1 = insert(:user)
      player2 = insert(:user)
      tournament = create_tournament(creator)

      active_game =
        insert(:game,
          tournament_id: tournament.id,
          state: "playing",
          player_ids: [player1.id, player2.id],
          players: [Player.build(player1), Player.build(player2)]
        )

      rematch_game =
        insert(:game,
          tournament_id: tournament.id,
          state: "playing",
          player_ids: [player2.id, player1.id],
          players: [Player.build(player2), Player.build(player1)]
        )

      TournamentAdminChannel.store_active_game(tournament.id, active_game.id)

      assert {:ok, %{active_game: %{id: active_game_id}}, socket} =
               subscribe_and_join(
                 streamer_socket(tournament.id),
                 TournamentStreamerChannel,
                 "tournament_streamer",
                 %{}
               )

      assert active_game_id == active_game.id

      send(socket.channel_pid, %{
        event: "tournament:match:upserted",
        payload: %{
          match: %Match{
            id: 2,
            game_id: rematch_game.id,
            player_ids: [player2.id, player1.id],
            rematch: true,
            state: "playing"
          }
        }
      })

      assert_push("active_game:set", %{game_id: game_id, game: %{id: game_id}})
      assert game_id == rematch_game.id
      assert TournamentAdminChannel.get_active_game(tournament.id) == rematch_game.id
    end
  end

  describe "handle_in/3" do
    test "ignores all incoming messages from FE" do
      creator = insert(:user)
      tournament = create_tournament(creator)

      {:ok, _payload, socket} =
        subscribe_and_join(
          streamer_socket(tournament.id),
          TournamentStreamerChannel,
          "tournament_streamer",
          %{}
        )

      ref = push(socket, "anything", %{"foo" => "bar"})
      refute_reply(ref, _, _)
    end
  end
end
