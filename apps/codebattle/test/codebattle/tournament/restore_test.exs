defmodule Codebattle.Tournament.RestoreTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Game
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
  end
end
