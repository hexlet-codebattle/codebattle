defmodule Codebattle.Tournament.SwissIncrementalRankingOddTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers
  import Ecto.Query

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Players
  alias Codebattle.Tournament.Storage.Ranking, as: RankingStorage
  alias Codebattle.Tournament.TournamentResult

  @rounds 30
  @configured_rounds 31
  @players_count 7

  test "incremental swiss ranking matches full historical aggregation after every real round with odd player count" do
    tasks = insert_list(@rounds, :task, level: "easy", time_to_solve_sec: 60)
    insert(:task_pack, name: "swiss-incremental-odd-30-rounds", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user, name: "creator")
    users = Enum.map(1..@players_count, &insert(:user, name: "odd-player-#{&1}"))

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Swiss incremental odd 30 rounds",
        "description" => "ranking consistency odd",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "swiss-incremental-odd-30-rounds",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_user",
        "score_strategy" => "75_percentile",
        "type" => "swiss",
        "state" => "waiting_participants",
        "rounds_limit" => Integer.to_string(@configured_rounds),
        "players_limit" => @players_count,
        "use_chat" => "false",
        "use_clan" => "false"
      })

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: creator, time_step_ms: 20_000, min_time_sec: 0})

    0..(@rounds - 1)
    |> Enum.reduce(tournament.id, fn round_position, tournament_id ->
      tournament = wait_for_round(tournament_id, round_position)
      matches = tournament |> get_matches("playing") |> Enum.sort_by(& &1.id)
      players_by_id = tournament |> get_players() |> Map.new(&{&1.id, &1})

      assert length(matches) == div(@players_count + 1, 2)

      assert Enum.any?(matches, fn match ->
               Enum.any?(match.player_ids, fn player_id ->
                 Map.get(players_by_id, player_id, %{is_bot: false}).is_bot
               end)
             end)

      matches
      |> Enum.with_index(1)
      |> Enum.each(fn {match, match_index} ->
        resolve_match(tournament, players_by_id, match, round_position, match_index)
      end)

      tournament = wait_for_round(tournament_id, round_position + 1)

      assert_incremental_ranking_matches_full_aggregation(tournament, round_position)

      tournament_id
    end)
    |> then(fn tournament_id ->
      Tournament.Server.handle_event(tournament_id, :cancel, %{})
    end)
  end

  defp resolve_match(tournament, players_by_id, match, round_position, match_index) do
    if rem(round_position + match_index, 4) == 0 do
      assert {:ok, _game} = GameContext.trigger_timeout(match.game_id)
    else
      [player1_id, player2_id] = match.player_ids

      real_player_ids =
        Enum.reject([player1_id, player2_id], fn player_id ->
          Map.get(players_by_id, player_id, %{is_bot: false}).is_bot
        end)

      winner_id = Enum.min(real_player_ids)
      winner = Enum.find(get_players(tournament), &(&1.id == winner_id))

      win_active_match(tournament, winner, %{
        opponent_percent: 0,
        duration_sec: round_position * 10 + match_index
      })
    end
  end

  defp assert_incremental_ranking_matches_full_aggregation(tournament, finished_round_position) do
    expected = expected_ranking(tournament)
    actual_players = actual_player_ranking(tournament)
    actual_ranking = actual_ranking_table(tournament)
    ranked_player_ids = ranked_player_ids_for_round(tournament, finished_round_position)

    assert actual_players == expected
    assert actual_ranking == Enum.map(expected, &Map.take(&1, [:id, :place, :score]))

    assert Enum.all?(Players.get_players(tournament), fn player ->
             if player.id in ranked_player_ids do
               player.last_ranked_round_position == finished_round_position
             else
               true
             end
           end)
  end

  defp expected_ranking(tournament) do
    TournamentResult
    |> where([tr], tr.tournament_id == ^tournament.id)
    |> group_by([tr], tr.user_id)
    |> select([tr], %{
      id: tr.user_id,
      score: sum(tr.score),
      total_duration_sec: sum(tr.duration_sec)
    })
    |> order_by([tr], desc: sum(tr.score), asc: sum(tr.duration_sec), asc: tr.user_id)
    |> Repo.all()
    |> Enum.with_index(1)
    |> Enum.map(fn {entry, place} ->
      %{
        id: entry.id,
        score: entry.score,
        total_duration_sec: entry.total_duration_sec,
        place: place
      }
    end)
  end

  defp actual_player_ranking(tournament) do
    tournament
    |> get_players()
    |> Enum.reject(& &1.is_bot)
    |> Enum.sort_by(& &1.place)
    |> Enum.map(fn player ->
      %{
        id: player.id,
        score: player.score,
        total_duration_sec: player.total_duration_sec,
        place: player.place
      }
    end)
  end

  defp actual_ranking_table(tournament) do
    tournament
    |> RankingStorage.get_all()
    |> Enum.sort_by(& &1.place)
    |> Enum.map(&Map.take(&1, [:id, :place, :score]))
  end

  defp ranked_player_ids_for_round(tournament, round_position) do
    TournamentResult
    |> where([tr], tr.tournament_id == ^tournament.id and tr.round_position == ^round_position)
    |> select([tr], tr.user_id)
    |> Repo.all()
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
end
