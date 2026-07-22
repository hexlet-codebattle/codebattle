defmodule Codebattle.Tournament.RestoreTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Game
  alias Codebattle.Game.Player
  alias Codebattle.Tournament

  describe "restore_after_release/1" do
    test "restores waiting_participants tournaments with joined players" do
      creator = insert(:user)
      users = [insert(:user), insert(:user)]

      starts_at = Calendar.strftime(NaiveDateTime.utc_now(), "%Y-%m-%dT%H:%M")

      {:ok, tournament} =
        Tournament.Context.create(%{
          "creator" => creator,
          "description" => "restore waiting tournament",
          "name" => "Waiting Restore",
          "players_limit" => 8,
          "starts_at" => starts_at,
          "type" => "swiss"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{users: users})

      Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

      assert :ok =
               tournament.id
               |> Tournament.Context.get_from_db!()
               |> Tournament.Context.restore_after_release()

      restored = Tournament.Context.get!(tournament.id)

      assert restored.state == "waiting_participants"
      assert Enum.sort(Enum.map(get_players(restored), & &1.id)) == Enum.sort(Enum.map(users, & &1.id))
      assert restored.players_count == 2
      assert Enum.map(Tournament.Ranking.get_first(restored, 10), & &1.id) == Enum.map(users, & &1.id)
    end

    test "restores active tournaments by rebuilding ranking and rerunning current round" do
      creator = insert(:user)
      users = [insert(:user), insert(:user)]
      insert(:task)
      insert(:task)

      starts_at = Calendar.strftime(NaiveDateTime.utc_now(), "%Y-%m-%dT%H:%M")

      {:ok, tournament} =
        Tournament.Context.create(%{
          "creator" => creator,
          "description" => "restore active tournament",
          "name" => "Active Restore",
          "players_limit" => 8,
          "round_timeout_seconds" => 300,
          "rounds_limit" => 2,
          "starts_at" => starts_at,
          "timeout_mode" => "per_round_fixed",
          "type" => "swiss"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: creator})

      [first_round_match] = get_current_round_matches(Tournament.Context.get!(tournament.id))
      first_round_game = Game.Context.get_game!(first_round_match.game_id)

      players =
        Enum.map(first_round_game.players, fn player ->
          if player.id == hd(users).id do
            %{player | result: "won", result_percent: 100.0}
          else
            %{player | result: "lost", result_percent: 0.0}
          end
        end)

      updated_game =
        first_round_game
        |> Game.changeset(%{
          duration_sec: 10,
          finishes_at: NaiveDateTime.utc_now(:second),
          players: players,
          state: "game_over"
        })
        |> Repo.update!()

      Tournament.Server.handle_event(tournament.id, :finish_match, %{
        duration_sec: updated_game.duration_sec,
        game_id: updated_game.id,
        game_state: "game_over",
        player_results: Codebattle.Game.Helpers.get_player_results(updated_game),
        ref: first_round_match.id
      })

      Tournament.Server.handle_event(tournament.id, :finish_round, %{})
      Tournament.Server.handle_event(tournament.id, :start_round_force, %{})

      live_tournament = Tournament.Context.get!(tournament.id)
      [current_match] = get_current_round_matches(live_tournament)
      old_game_id = current_match.game_id

      Game.Context.terminate_tournament_games(tournament.id)
      Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

      assert :ok =
               tournament.id
               |> Tournament.Context.get_from_db!()
               |> Tournament.Context.restore_after_release()

      restored = Tournament.Context.get!(tournament.id)
      [restored_match] = get_current_round_matches(restored)
      ranking = Tournament.Ranking.get_first(restored, 10)

      assert restored.state == "active"
      assert restored.current_round_position == 1
      assert restored.players_count == 2
      assert restored_match.state == "playing"
      assert restored_match.game_id != old_game_id
      assert Enum.any?(ranking, &(&1.score > 0))

      assert Repo.get!(Game, old_game_id).state == "canceled"
    end

    test "restores a persisted active break and rearms its remaining timer" do
      user = insert(:user)

      tournament =
        insert(:tournament,
          type: "swiss",
          state: "active",
          break_state: "on",
          current_round_position: 1,
          break_duration_seconds: 300,
          last_round_ended_at: NaiveDateTime.utc_now(:second),
          players: %{
            user.id =>
              Tournament.Player.new!(%{
                id: user.id,
                name: user.name,
                state: "active",
                is_bot: false
              })
          },
          task_ids: []
        )

      on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(tournament.id) end)

      assert :ok =
               tournament.id
               |> Tournament.Context.get_from_db!()
               |> Tournament.Context.restore_after_release()

      restored = Tournament.Context.get!(tournament.id)
      assert restored.state == "active"
      assert restored.break_state == "on"
      assert restored.current_round_position == 1
      assert Enum.map(get_players(restored), & &1.id) == [user.id]
    end

    test "immediately ends an expired restored break" do
      tournament =
        insert(:tournament,
          type: "swiss",
          state: "active",
          break_state: "on",
          current_round_position: 0,
          rounds_limit: 2,
          break_duration_seconds: 30,
          last_round_ended_at: nil,
          players: %{},
          task_ids: []
        )

      on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(tournament.id) end)

      assert :ok =
               tournament.id
               |> Tournament.Context.get_from_db!()
               |> Tournament.Context.restore_after_release()

      restored = Tournament.Context.get!(tournament.id)
      assert restored.break_state == "off"
      assert restored.round_state == "active"
    end

    test "restores the first active round without persisted games or a start timestamp" do
      tournament =
        insert(:tournament,
          type: "swiss",
          state: "active",
          break_state: "off",
          current_round_position: 0,
          timeout_mode: "per_round_fixed",
          last_round_started_at: nil,
          players: %{},
          task_ids: []
        )

      on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(tournament.id) end)

      assert :ok =
               tournament.id
               |> Tournament.Context.get_from_db!()
               |> Tournament.Context.restore_after_release()

      restored = Tournament.Context.get!(tournament.id)
      assert restored.state == "active"
      assert restored.current_round_position == 0
      assert get_matches(restored) == []
    end

    test "restores bots, solo history, and every persisted match terminal state" do
      human = insert(:user)
      bot = insert(:user, is_bot: true)
      task = insert(:task)
      human_player = Player.build(human, %{result: "timeout"})
      bot_player = Player.build(bot, %{result: "timeout"})

      tournament =
        insert(:tournament,
          type: "swiss",
          state: "active",
          break_state: "off",
          current_round_position: 1,
          timeout_mode: "per_task",
          players: %{
            human.id =>
              Tournament.Player.new!(%{
                id: human.id,
                name: human.name,
                state: "active",
                is_bot: false
              })
          },
          task_ids: [task.id]
        )

      for {state, ref} <- Enum.with_index(["game_over", "timeout", "canceled", "playing"], 1) do
        insert(:game,
          tournament_id: tournament.id,
          task: task,
          ref: ref,
          round_position: 0,
          state: state,
          player_ids: [human.id, bot.id],
          players: [human_player, bot_player]
        )
      end

      insert(:game,
        tournament_id: tournament.id,
        task: task,
        ref: 10,
        round_position: 0,
        state: "timeout",
        player_ids: [human.id],
        players: [human_player]
      )

      on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(tournament.id) end)

      assert :ok =
               tournament.id
               |> Tournament.Context.get_from_db!()
               |> Tournament.Context.restore_after_release()

      restored = Tournament.Context.get!(tournament.id)
      assert Enum.sort(Enum.map(get_players(restored), & &1.id)) == Enum.sort([human.id, bot.id])

      assert Enum.sort(Enum.map(get_matches(restored), & &1.state)) ==
               Enum.sort(["game_over", "timeout", "canceled", "canceled", "timeout"])

      assert restored.played_pair_ids == MapSet.new()
    end
  end
end
