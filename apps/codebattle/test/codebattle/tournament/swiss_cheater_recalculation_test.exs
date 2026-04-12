defmodule Codebattle.Tournament.SwissCheaterRecalculationTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers
  import Ecto.Query

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.TournamentUserResult

  @rounds 7
  @players_count 10

  test "finished swiss tournament automatically zeroes cheaters and moves them to the last places" do
    tasks = insert_list(@rounds, :task, level: "easy", time_to_solve_sec: 60)
    insert(:task_pack, name: "swiss-cheater-7-rounds", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user, name: "creator")
    users = Enum.map(1..@players_count, &insert(:user, name: "player-#{&1}"))

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Swiss cheater recalc",
        "description" => "cheater recalc consistency",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "swiss-cheater-7-rounds",
        "creator" => creator,
        "break_duration_seconds" => 1,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_user",
        "score_strategy" => "75_percentile",
        "type" => "swiss",
        "state" => "waiting_participants",
        "rounds_limit" => Integer.to_string(@rounds),
        "players_limit" => @players_count,
        "use_chat" => "false",
        "use_clan" => "false"
      })

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: creator, time_step_ms: 20_000, min_time_sec: 0})

    cheater_schedule = %{
      0 => Enum.at(users, 0).id,
      2 => Enum.at(users, 1).id,
      4 => Enum.at(users, 2).id
    }

    {cheater_ids, cheated_game_ids_by_user} =
      Enum.reduce(0..(@rounds - 1), {MapSet.new(), %{}}, fn round_position, {cheaters_acc, games_acc} ->
        tournament = wait_for_round(tournament.id, round_position)
        matches = tournament |> get_matches("playing") |> Enum.sort_by(& &1.id)

        matches
        |> Enum.with_index(1)
        |> Enum.each(fn {match, match_index} ->
          resolve_match(tournament, match, round_position, match_index)
        end)

        case Map.fetch(cheater_schedule, round_position) do
          {:ok, cheater_id} ->
            break_tournament = wait_for_round_break(tournament.id, round_position)

            cheated_game_ids =
              break_tournament
              |> get_round_matches(round_position)
              |> Enum.filter(&(cheater_id in &1.player_ids))
              |> Enum.map(& &1.game_id)

            Tournament.Server.handle_event(tournament.id, :toggle_cheater_player, %{user_id: cheater_id})

            if round_position < @rounds - 1 do
              next_round_tournament = wait_for_round(tournament.id, round_position + 1)
              refute Enum.any?(get_matches(next_round_tournament, "playing"), &(cheater_id in &1.player_ids))
            end

            {MapSet.put(cheaters_acc, cheater_id), Map.put(games_acc, cheater_id, cheated_game_ids)}

          :error ->
            if round_position < @rounds - 1 do
              wait_for_round(tournament.id, round_position + 1)
            end

            {cheaters_acc, games_acc}
        end
      end)

    finished_tournament = wait_for_finished(tournament.id)
    cheater_ids = Enum.sort(cheater_ids)

    assert finished_tournament.state == "finished"
    assert Enum.sort(finished_tournament.cheater_ids) == cheater_ids

    final_results =
      TournamentUserResult
      |> where([tur], tur.tournament_id == ^tournament.id)
      |> order_by([tur], asc: tur.place)
      |> Repo.all()

    assert length(final_results) == @players_count

    cheater_rows =
      final_results
      |> Enum.filter(&(&1.user_id in cheater_ids))
      |> Enum.sort_by(& &1.place)

    assert Enum.map(cheater_rows, & &1.user_id) == cheater_ids
    assert Enum.map(cheater_rows, & &1.place) == Enum.to_list((@players_count - length(cheater_ids) + 1)..@players_count)

    assert Enum.all?(cheater_rows, fn row ->
             row.score == 0 and row.total_time == 0 and row.wins_count == 0 and row.games_count == 0 and row.is_cheater
           end)

    fair_rows = Enum.reject(final_results, &(&1.user_id in cheater_ids))
    assert Enum.all?(fair_rows, &(&1.is_cheater == false))

    live_tournament = Tournament.Server.get_tournament(tournament.id)

    Enum.each(cheater_ids, fn cheater_id ->
      player = get_player(live_tournament, cheater_id)
      row = Enum.find(cheater_rows, &(&1.user_id == cheater_id))

      assert player.score == 0
      assert player.total_duration_sec == 0
      assert player.wins_count == 0
      assert player.place == row.place
    end)

    cheated_game_ids =
      cheated_game_ids_by_user
      |> Map.values()
      |> List.flatten()
      |> Enum.uniq()

    cheated_rows =
      TournamentResult
      |> where([tr], tr.tournament_id == ^tournament.id and tr.game_id in ^cheated_game_ids)
      |> Repo.all()

    assert cheated_rows != []

    # Only the cheater's rows should have was_cheated=true, not their opponents
    Enum.each(cheated_rows, fn row ->
      if row.user_id in cheater_ids do
        assert row.was_cheated, "cheater #{row.user_id} should have was_cheated=true"
        assert row.score == 0, "cheater #{row.user_id} should have score=0"
      else
        refute row.was_cheated, "opponent #{row.user_id} should have was_cheated=false"
      end
    end)
  end

  defp resolve_match(tournament, match, round_position, match_index) do
    if rem(round_position + match_index, 4) == 0 do
      assert {:ok, _game} = GameContext.trigger_timeout(match.game_id)
    else
      [player1_id, player2_id] = match.player_ids
      winner_id = if rem(round_position + match_index, 2) == 0, do: player1_id, else: player2_id
      winner = Enum.find(get_players(tournament), &(&1.id == winner_id))

      win_active_match(tournament, winner, %{
        opponent_percent: 0,
        duration_sec: round_position * 10 + match_index
      })
    end
  end

  defp wait_for_round(tournament_id, round_position, attempts \\ 500)

  defp wait_for_round(tournament_id, round_position, 0) do
    tournament = Tournament.Context.get(tournament_id)

    flunk(
      "tournament did not reach expected round #{round_position}, current=#{tournament.current_round_position}, state=#{tournament.state}, round_state=#{inspect(tournament.round_state)}"
    )
  end

  defp wait_for_round(tournament_id, round_position, attempts) do
    tournament = Tournament.Context.get(tournament_id)

    if tournament.current_round_position == round_position and tournament.state == "active" do
      playing_matches = get_matches(tournament, "playing")

      if playing_matches == [] do
        Process.sleep(20)
        wait_for_round(tournament_id, round_position, attempts - 1)
      else
        tournament
      end
    else
      Process.sleep(20)
      wait_for_round(tournament_id, round_position, attempts - 1)
    end
  end

  defp wait_for_round_break(tournament_id, round_position, attempts \\ 500)

  defp wait_for_round_break(tournament_id, round_position, 0) do
    tournament = Tournament.Context.get(tournament_id)

    flunk(
      "tournament did not reach break after round #{round_position}, current=#{tournament.current_round_position}, state=#{tournament.state}, round_state=#{inspect(tournament.round_state)}"
    )
  end

  defp wait_for_round_break(tournament_id, round_position, attempts) do
    tournament = Tournament.Context.get(tournament_id)

    if tournament.current_round_position == round_position and tournament.round_state == "break" do
      tournament
    else
      Process.sleep(20)
      wait_for_round_break(tournament_id, round_position, attempts - 1)
    end
  end

  defp wait_for_finished(tournament_id, attempts \\ 500)

  defp wait_for_finished(tournament_id, 0) do
    tournament = Tournament.Context.get(tournament_id)
    flunk("tournament did not finish, state=#{tournament.state}, round_state=#{inspect(tournament.round_state)}")
  end

  defp wait_for_finished(tournament_id, attempts) do
    tournament = Tournament.Context.get(tournament_id)

    if tournament.state == "finished" do
      tournament
    else
      Process.sleep(20)
      wait_for_finished(tournament_id, attempts - 1)
    end
  end
end
