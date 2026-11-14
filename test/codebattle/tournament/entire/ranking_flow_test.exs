defmodule Codebattle.Tournament.Entire.RankingFlowTest do
  @moduledoc """
  Plays whole tournaments through the real game and tournament servers and checks every
  ranking number against an independent model of the scoring rules: the points of each
  game, the scores shown on the matches, the live standings after every round and the
  final leaderboard. Test time is frozen, so a game's duration is set by back-dating its
  start, which drives the speed multipliers with real values.
  """
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Ecto.Query

  alias Codebattle.Bot
  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Storage.Ranking, as: RankingStorage
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User

  @base_score 100
  @time_to_solve_sec 300
  @pro_points [128, 64, 32, 16, 8, 4, 2]

  # Outcomes of a round, applied to its human matches in match-id order, then to the bot
  # match. Durations are seconds; percents are the share of tests passed (0, 33, 66, 100).
  # Round 0: the bot beats a human faster than every human winner. Round 2: slower than
  # every human winner, whose times are equal (a zero-width speed range).
  @swiss_rounds [
    %{
      humans: [{:win, :first, 100, 33}, {:win, :second, 160, 66}, {:timeout, 240, 66, 33}],
      bot: {:bot_wins, 40, 66}
    },
    %{
      humans: [{:win, :second, 120, 0}, {:win, :first, 200, 33}, {:timeout, 250, 0, 66}],
      bot: {:human_wins, 90}
    },
    %{
      humans: [{:win, :first, 150, 66}, {:win, :second, 150, 0}, {:timeout, 280, 33, 33}],
      bot: {:bot_wins, 290, 33}
    }
  ]

  # Points of the human who lost to the bot in round 0 (fast bot) and round 2 (slow bot).
  # The speed multiplier must stay within [1, 2]: 75_percentile used to give 3x and -138x.
  @swiss_bot_loss_points %{
    "75_percentile" => {153, 50},
    "static_base_score" => {50, 25},
    "win_loss" => {0, 0}
  }

  # What a player who lost a game to a cheater ends up with.
  @cheater_victim_points %{"75_percentile" => 150, "static_base_score" => @base_score, "win_loss" => 1}

  @ladder_rounds [
    %{humans: [{:win, :first, 60, 33}, {:timeout, 200, 66, 0}], bot: {:bot_wins, 30, 66}},
    %{humans: [{:win, :second, 150, 66}, {:timeout, 100, 33, 33}], bot: {:human_wins, 45}},
    %{humans: [{:win, :first, 299, 0}, {:win, :second, 10, 33}], bot: {:bot_wins, 280, 33}}
  ]

  for strategy <- ~w(75_percentile static_base_score win_loss) do
    @tag strategy: strategy
    test "swiss #{strategy}: every game outcome is scored and ranked by the rules", %{strategy: strategy} do
      users = insert_list(7, :user)
      user_ids = Enum.map(users, & &1.id)
      config = start_tournament(%{type: "swiss", strategy: strategy, grade: "pro"}, users, length(@swiss_rounds))

      tournament = play_rounds(config, @swiss_rounds, user_ids)

      {fast_bot_loss, slow_bot_loss} = @swiss_bot_loss_points[strategy]
      assert bot_loss_points(tournament, 0) == fast_bot_loss
      assert bot_loss_points(tournament, 2) == slow_bot_loss

      assert_final_standings(config, tournament, user_ids, [])
    end

    @tag strategy: strategy
    test "swiss #{strategy}: a cheater scores nothing and their opponents are made whole", %{strategy: strategy} do
      users = insert_list(6, :user)
      user_ids = Enum.map(users, & &1.id)
      config = start_tournament(%{type: "swiss", strategy: strategy, grade: "open"}, users, 3)

      # Round 0: the future cheater wins their game against a player with a third of the tests.
      tournament = wait_for_round(config.id, 0, 3)
      [cheater_match | other_matches] = playing_matches(tournament)
      [cheater_id, victim_id] = cheater_match.player_ids
      play_match(tournament, cheater_match, {:win, :first, 100, 33})
      play_matches(tournament, other_matches, [{:win, :second, 150, 66}, {:timeout, 200, 33, 0}])

      # Round 1: caught mid-game, once another game of the round is already won.
      tournament = wait_for_round(config.id, 1, 3)

      {[cheater_match], [early_match, late_match]} =
        Enum.split_with(playing_matches(tournament), &(cheater_id in &1.player_ids))

      play_match(tournament, early_match, {:win, :first, 180, 66})
      assert_points_on_finish(config, tournament, early_match)
      Tournament.Server.handle_event(config.id, :toggle_cheater_player, %{user_id: cheater_id})

      # The live standings drop the cheater and re-score round 0 at once; the win in round 1 stays.
      tournament = Tournament.Context.get(config.id)
      assert_round_points(config, tournament, 0, [cheater_id])
      assert_live_standings(config, tournament, 0, user_ids, [cheater_id])
      assert match_points(tournament, 0, victim_id) == @cheater_victim_points[strategy]

      early_winner_id = hd(early_match.player_ids)
      round0 = expected_standings(config, round_games(config.id, 0), [cheater_id], [early_winner_id])
      assert get_player(tournament, early_winner_id).wins_count == hd(round0).wins_count + 1

      [opponent_id] = cheater_match.player_ids -- [cheater_id]
      play_match(tournament, %{cheater_match | player_ids: [opponent_id, cheater_id]}, {:win, :first, 120, 0})
      play_match(tournament, late_match, {:timeout, 220, 0, 66})

      # Round 1 is added on top of the rebuilt standings, nothing counted twice.
      tournament = wait_for_round(config.id, 2, 3)
      assert_round_points(config, tournament, 1, [cheater_id])
      assert_live_standings(config, tournament, 1, user_ids, [cheater_id])

      # Round 2 goes on without the cheater: two games and one against the bot.
      {[bot_match], human_matches} = Enum.split_with(playing_matches(tournament), &bot_match?(tournament, &1))
      refute Enum.any?(human_matches ++ [bot_match], &(cheater_id in &1.player_ids))
      play_matches(tournament, human_matches, [{:win, :first, 130, 33}, {:timeout, 210, 66, 0}])
      play_match(tournament, bot_match, {:human_wins, 70})

      tournament = wait_for_finished(config.id)
      assert_final_standings(config, tournament, user_ids, [cheater_id])
      assert match_points(tournament, 0, victim_id) == @cheater_victim_points[strategy]
    end
  end

  test "before the start, joins and leaves keep the list gapless in join order, with each Elo" do
    [a, b, c, d, e, f] = for rating <- [1500, 1210, 1990, 1300, 1755, 1420], do: insert(:user, rating: rating)
    config = create_tournament(%{type: "swiss", strategy: "75_percentile", grade: "open"}, 1)

    steps = [join: a, join: b, join: c, leave: b, join: d, leave: a, join: e, leave: e, join: b, join: f, leave: c]

    joined =
      Enum.reduce(steps, [], fn {action, user}, joined ->
        joined =
          case action do
            :join ->
              Tournament.Server.handle_event(config.id, :join, %{user: user})
              joined ++ [user]

            :leave ->
              Tournament.Server.handle_event(config.id, :leave, %{user_id: user.id})
              joined -- [user]
          end

        tournament = Tournament.Context.get(config.id)
        entries = tournament |> Tournament.Ranking.get_full() |> Map.fetch!(:entries)

        assert Enum.map(entries, &{&1.id, &1.place, &1.rating}) ==
                 joined |> Enum.with_index(1) |> Enum.map(fn {user, place} -> {user.id, place, user.rating} end)

        assert tournament.players_count == length(joined)
        joined
      end)

    # The start ranks exactly the players who stayed, places 1..n.
    Tournament.Server.handle_event(config.id, :start, %{user: config.creator})
    tournament = Tournament.Context.get(config.id)
    entries = tournament |> Tournament.Ranking.get_full() |> Map.fetch!(:entries)

    assert Enum.map(entries, & &1.place) == Enum.to_list(1..length(joined))
    assert entries |> Enum.map(& &1.id) |> Enum.sort() == joined |> Enum.map(& &1.id) |> Enum.sort()
  end

  test "ladder: every game outcome is scored on the match and ranked by the rules" do
    users = insert_list(5, :user)
    user_ids = Enum.map(users, & &1.id)
    config = start_tournament(%{type: "ladder", strategy: "static_base_score", grade: "open"}, users, 3)

    tournament = play_rounds(config, @ladder_rounds, user_ids)

    # A ladder winner's multiplier depends only on their own time: 2 - duration / time_to_solve.
    assert bot_loss_points(tournament, 0) == 50
    assert round_win_points(tournament, 2) == [100, 197]

    assert_final_standings(config, tournament, user_ids, [])
  end

  test "ladder: catching a cheater rebuilds the points of every round" do
    users = insert_list(4, :user)
    user_ids = Enum.map(users, & &1.id)
    config = start_tournament(%{type: "ladder", strategy: "static_base_score", grade: "open"}, users, 2)

    tournament = wait_for_round(config.id, 0, 2)
    [cheater_match, other_match] = playing_matches(tournament)
    [cheater_id, victim_id] = cheater_match.player_ids
    play_match(tournament, cheater_match, {:win, :first, 60, 33})
    play_match(tournament, other_match, {:win, :second, 120, 0})

    # Before the ban the lost game counts as an ordinary loss.
    tournament = wait_for_round(config.id, 1, 2)
    assert match_points(tournament, 0, victim_id) == 25

    {[cheater_match], [other_match]} = Enum.split_with(playing_matches(tournament), &(cheater_id in &1.player_ids))
    Tournament.Server.handle_event(config.id, :toggle_cheater_player, %{user_id: cheater_id})
    [opponent_id] = cheater_match.player_ids -- [cheater_id]
    play_match(tournament, %{cheater_match | player_ids: [opponent_id, cheater_id]}, {:win, :first, 90, 0})
    play_match(tournament, other_match, {:timeout, 200, 33, 66})

    tournament = wait_for_finished(config.id)
    assert_final_standings(config, tournament, user_ids, [cheater_id])
    assert match_points(tournament, 0, victim_id) == @base_score
  end

  # -- Playing ----------------------------------------------------------------------------

  defp start_tournament(config, users, rounds_count) do
    config = create_tournament(config, rounds_count)
    Tournament.Server.handle_event(config.id, :join, %{users: users})
    Tournament.Server.handle_event(config.id, :start, %{user: config.creator})
    config
  end

  defp create_tournament(config, rounds_count) do
    tasks =
      insert_list(rounds_count, :task, level: "easy", base_score: @base_score, time_to_solve_sec: @time_to_solve_sec)

    task_pack = insert(:task_pack, task_ids: Enum.map(tasks, & &1.id))
    creator = insert(:user)

    # starts_at lies ahead so a graded tournament doesn't start (or cancel) on its own.
    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2099-01-01T12:00",
        "name" => "Ranking flow",
        "description" => "ranking flow",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "type" => config.type,
        "score_strategy" => config.strategy,
        "ranking_type" => "by_user",
        "grade" => config.grade,
        "task_pack_name" => task_pack.name,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "timeout_mode" => "per_task",
        "state" => "waiting_participants",
        "round_timeout_seconds" => @time_to_solve_sec,
        "break_duration_seconds" => 0,
        "rounds_limit" => Integer.to_string(rounds_count),
        "players_limit" => 16,
        "use_chat" => "false"
      })

    Map.merge(config, %{id: tournament.id, creator: creator, tasks: Map.new(tasks, &{&1.id, &1})})
  end

  # Plays every round and checks the points and the live standings once each round is over.
  defp play_rounds(config, rounds, user_ids) do
    last_round = length(rounds) - 1

    rounds
    |> Enum.with_index()
    |> Enum.reduce(nil, fn {plan, round_position}, _tournament ->
      matches_count = length(plan.humans) + 1
      tournament = wait_for_round(config.id, round_position, matches_count)
      {bot_matches, human_matches} = Enum.split_with(playing_matches(tournament), &bot_match?(tournament, &1))
      assert [bot_match] = bot_matches
      assert length(human_matches) == length(plan.humans)

      # The last game ends the round (a ladder tick re-syncs every match from the stored
      # results), so the points a match shows on its own are checked for the others.
      {last, others} = List.pop_at([{bot_match, plan.bot} | Enum.zip(human_matches, plan.humans)], -1)

      Enum.each(others, fn {match, outcome} ->
        play_match(tournament, match, outcome)
        assert_points_on_finish(config, tournament, match)
      end)

      play_match(tournament, elem(last, 0), elem(last, 1))

      tournament =
        if round_position == last_round,
          do: wait_for_finished(config.id),
          else: wait_for_round(config.id, round_position + 1, matches_count)

      assert_round_points(config, tournament, round_position, [])
      assert_live_standings(config, tournament, round_position, user_ids)
      tournament
    end)
  end

  defp play_matches(tournament, matches, outcomes) do
    assert length(matches) == length(outcomes)
    Enum.zip_with(matches, outcomes, &play_match(tournament, &1, &2))
  end

  defp play_match(_tournament, %{player_ids: [first, second]} = match, {:win, side, duration, loser_percent}) do
    {winner, loser} = if side == :first, do: {first, second}, else: {second, first}
    set_elapsed(match.game_id, duration)
    submit(match.game_id, loser, loser_percent)
    submit(match.game_id, winner, 100)
  end

  defp play_match(
         _tournament,
         %{player_ids: [first, second]} = match,
         {:timeout, duration, first_percent, second_percent}
       ) do
    set_elapsed(match.game_id, duration)
    submit(match.game_id, first, first_percent)
    submit(match.game_id, second, second_percent)
    assert {:ok, %{state: "timeout"}} = Game.Context.trigger_timeout(match.game_id)
  end

  defp play_match(tournament, match, {:bot_wins, duration, human_percent}) do
    {bot, human} = bot_and_human(tournament, match)
    set_elapsed(match.game_id, duration)
    submit(match.game_id, human, human_percent)
    submit(match.game_id, bot, 100)
  end

  defp play_match(tournament, match, {:human_wins, duration}) do
    {_bot, human} = bot_and_human(tournament, match)
    set_elapsed(match.game_id, duration)
    submit(match.game_id, human, 100)
  end

  # Test time is frozen, so a game lasts exactly as long as its start lies in the past.
  defp set_elapsed(game_id, seconds) do
    [{pid, _value}] = Registry.lookup(Codebattle.Registry, "game_srv:#{game_id}")
    starts_at = NaiveDateTime.add(TimeHelper.utc_now(), -seconds, :second)
    :sys.replace_state(pid, fn state -> put_in(state.game.starts_at, starts_at) end)
  end

  defp submit(_game_id, _user_id, 0), do: :ok

  defp submit(game_id, user_id, percent) do
    params = %{user: User.get!(user_id), editor_text: "solve_percent_#{percent}", editor_lang: "js"}
    assert {:ok, _game, _result} = Game.Context.check_result(game_id, params)
  end

  defp playing_matches(tournament), do: tournament |> get_matches("playing") |> Enum.sort_by(& &1.id)

  defp bot_match?(_tournament, match), do: Enum.any?(match.player_ids, &bot?/1)

  defp bot_and_human(_tournament, match) do
    [bot] = Enum.filter(match.player_ids, &bot?/1)
    [human] = match.player_ids -- [bot]
    {bot, human}
  end

  defp bot?(user_id), do: Bot.Context.get(user_id) != nil

  defp wait_for_round(tournament_id, round_position, matches_count) do
    wait_for("round #{round_position} with #{matches_count} playing matches", fn ->
      tournament = Tournament.Context.get(tournament_id)

      tournament.state == "active" and tournament.current_round_position == round_position and
        length(get_matches(tournament, "playing")) == matches_count and tournament
    end)
  end

  defp wait_for_finished(tournament_id) do
    wait_for("the tournament to finish", fn ->
      tournament = Tournament.Context.get(tournament_id)
      tournament.state == "finished" and tournament
    end)
  end

  defp wait_for(description, fun, attempts \\ 500) do
    case fun.() do
      result when result in [nil, false] ->
        if attempts == 0, do: flunk("timed out waiting for #{description}")
        Process.sleep(20)
        wait_for(description, fun, attempts - 1)

      result ->
        result
    end
  end

  # -- Checks -------------------------------------------------------------------------------

  defp assert_round_points(config, tournament, round_position, cheater_ids) do
    expected = expected_points(config, round_games(tournament.id, round_position), cheater_ids)

    stored =
      TournamentResult
      |> where([r], r.tournament_id == ^tournament.id and r.round_position == ^round_position)
      |> select([r], {{r.game_id, r.user_id}, r.score})
      |> Repo.all()
      |> Map.new()

    assert stored == expected
    assert shown_match_points(tournament, round_position, expected) == expected
  end

  # A ladder match is scored in memory as soon as its game ends; a swiss match only gets
  # its points when the round is over.
  defp assert_points_on_finish(%{type: "ladder"} = config, tournament, match) do
    wait_for("match #{match.id} to finish", fn ->
      tournament |> get_matches([match.id]) |> Enum.all?(&(&1.state != "playing"))
    end)

    expected = expected_points(config, [Repo.get!(Game, match.game_id)], [])
    assert shown_match_points(tournament, match.round_position, expected) == expected
  end

  defp assert_points_on_finish(%{type: "swiss"}, tournament, match) do
    wait_for("match #{match.id} to finish", fn ->
      tournament |> get_matches([match.id]) |> Enum.all?(&(&1.state != "playing"))
    end)

    assert tournament
           |> get_matches([match.id])
           |> hd()
           |> Map.fetch!(:player_results)
           |> Enum.all?(fn {_id, result} ->
             is_nil(result[:score])
           end)
  end

  # Banned players are left out of the live standings.
  defp assert_live_standings(config, tournament, round_position, user_ids, cheater_ids \\ []) do
    games = Enum.flat_map(0..round_position, &round_games(tournament.id, &1))
    expected = expected_standings(config, games, cheater_ids, user_ids -- cheater_ids)

    players =
      tournament
      |> get_players()
      |> Enum.reject(&(&1.is_bot or &1.state == "banned"))
      |> Enum.sort_by(& &1.place)
      |> Enum.map(&Map.take(&1, [:id, :place, :score, :total_duration_sec]))

    assert players == Enum.map(expected, &Map.take(&1, [:id, :place, :score, :total_duration_sec]))

    ranking =
      tournament
      |> RankingStorage.get_all()
      |> Enum.sort_by(& &1.place)
      |> Enum.map(&Map.take(&1, [:id, :place, :score]))

    assert ranking == Enum.map(expected, &Map.take(&1, [:id, :place, :score]))
  end

  defp assert_final_standings(config, tournament, user_ids, cheater_ids) do
    games = round_games(tournament.id)
    fair = expected_standings(config, games, cheater_ids, user_ids -- cheater_ids)

    cheaters =
      cheater_ids
      |> Enum.sort()
      |> Enum.with_index(length(fair) + 1)
      |> Enum.map(fn {id, place} ->
        %{id: id, place: place, score: 0, total_duration_sec: 0, wins_count: 0, games_count: 0}
      end)

    expected =
      Enum.map(fair, &Map.merge(&1, %{points: grade_points(config.grade, &1), is_cheater: false})) ++
        Enum.map(cheaters, &Map.merge(&1, %{points: 0, is_cheater: true}))

    leaderboard =
      tournament.id
      |> TournamentUserResult.get_leaderboard()
      |> Enum.map(fn row ->
        %{
          id: row.user_id,
          place: row.place,
          score: row.score,
          total_duration_sec: row.total_time,
          wins_count: row.wins_count,
          games_count: row.games_count,
          points: row.points,
          is_cheater: row.is_cheater
        }
      end)

    assert leaderboard == expected

    page = tournament |> Tournament.Ranking.get_page(1, 50) |> Map.fetch!(:entries)

    assert Enum.map(page, &Map.take(&1, [:id, :place, :score])) ==
             Enum.map(expected, &Map.take(&1, [:id, :place, :score]))

    player_fields = [:id, :place, :score, :wins_count, :total_duration_sec]

    players =
      tournament
      |> get_players()
      |> Enum.reject(& &1.is_bot)
      |> Enum.sort_by(& &1.place)
      |> Enum.map(&Map.take(&1, player_fields))

    assert players == Enum.map(expected, &Map.take(&1, player_fields))

    # Every match ends up showing its final points, cheater penalties included.
    games
    |> Enum.map(& &1.round_position)
    |> Enum.uniq()
    |> Enum.each(fn round_position ->
      expected_points = expected_points(config, round_games(tournament.id, round_position), cheater_ids)
      assert shown_match_points(tournament, round_position, expected_points) == expected_points
    end)
  end

  defp shown_match_points(tournament, round_position, expected) do
    for match <- get_round_matches(tournament, round_position),
        {player_id, result} <- match.player_results,
        Map.has_key?(expected, {match.game_id, player_id}),
        into: %{},
        do: {{match.game_id, player_id}, result[:score]}
  end

  defp match_points(tournament, round_position, player_id) do
    tournament
    |> get_round_matches(round_position)
    |> Enum.find(&(player_id in &1.player_ids))
    |> then(& &1.player_results[player_id][:score])
  end

  defp bot_loss_points(tournament, round_position) do
    bot_game =
      tournament.id
      |> round_games(round_position)
      |> Enum.find(fn game -> Enum.any?(game.players, &(&1.is_bot and &1.result == "won")) end)

    human = Enum.find(bot_game.players, &(!&1.is_bot))
    match_points(tournament, round_position, human.id)
  end

  defp round_win_points(tournament, round_position) do
    tournament.id
    |> round_games(round_position)
    |> Enum.flat_map(& &1.players)
    |> Enum.filter(&(!&1.is_bot and &1.result == "won"))
    |> Enum.map(&match_points(tournament, round_position, &1.id))
    |> Enum.sort()
  end

  defp round_games(tournament_id) do
    Game
    |> where([g], g.tournament_id == ^tournament_id)
    |> order_by([g], asc: g.id)
    |> Repo.all()
  end

  defp round_games(tournament_id, round_position) do
    Game
    |> where([g], g.tournament_id == ^tournament_id and g.round_position == ^round_position)
    |> order_by([g], asc: g.id)
    |> Repo.all()
  end

  # -- Model of the scoring rules -----------------------------------------------------------

  # Points per {game_id, user_id} for every human player of `games`.
  defp expected_points(%{strategy: "win_loss"}, games, cheater_ids) do
    for game <- games, player <- humans(game), into: %{} do
      points =
        cond do
          player.id in cheater_ids -> 0
          has_cheater?(game, cheater_ids) and game.state == "game_over" -> 1
          player.result_percent == 100.0 -> 1
          true -> 0
        end

      {{game.id, player.id}, points}
    end
  end

  # base = the 25th percentile of the winning times on the task; the winner time scales it
  # from 2x (fastest winner) to 1x (slowest), never beyond.
  defp expected_points(%{strategy: "75_percentile"}, games, cheater_ids) do
    stats =
      games
      |> Enum.filter(&human_win?(&1, cheater_ids))
      |> Enum.group_by(& &1.task_id, & &1.duration_sec)
      |> Map.new(fn {task_id, durations} -> {task_id, duration_stats(durations)} end)

    for game <- games, player <- humans(game), into: %{} do
      %{base: base, min: min, max: max} = Map.get(stats, game.task_id, %{base: 0, min: 0, max: 0})
      share = player.result_percent / 100

      points =
        cond do
          player.id in cheater_ids -> 0
          lost_to_cheater?(game, player, cheater_ids) -> base
          game.state == "timeout" -> 0.5 * base * share
          true -> base * clamp(2 - (game.duration_sec - min) / max(max - min, 1)) * share
        end

      {{game.id, player.id}, round(points)}
    end
  end

  # base = the task's base_score. Swiss winners scale it from 2x (fastest winner) to 1x (at
  # time_to_solve), a ladder winner from 2x (instant) to 1x (at time_to_solve); losers get
  # 0.75x and timeouts 0.5x, both times the share of tests passed.
  defp expected_points(%{strategy: "static_base_score"} = config, games, cheater_ids) do
    fastest =
      games
      |> Enum.filter(&human_win?(&1, cheater_ids))
      |> Enum.group_by(& &1.task_id, & &1.duration_sec)
      |> Map.new(fn {task_id, durations} -> {task_id, Enum.min(durations)} end)

    for game <- games, player <- humans(game), into: %{} do
      task = Map.fetch!(config.tasks, game.task_id)
      share = player.result_percent / 100

      points =
        cond do
          player.id in cheater_ids ->
            0

          lost_to_cheater?(game, player, cheater_ids) ->
            task.base_score

          game.state == "timeout" ->
            0.5 * task.base_score * share

          player.result == "won" ->
            multiplier = winner_multiplier(config.type, game.duration_sec, task, Map.get(fastest, game.task_id, 0))
            task.base_score * multiplier * share

          true ->
            0.75 * task.base_score * share
        end

      {{game.id, player.id}, round(points)}
    end
  end

  defp winner_multiplier("ladder", duration, task, _fastest), do: clamp(2 - duration / task.time_to_solve_sec)

  defp winner_multiplier("swiss", duration, task, fastest) do
    clamp(1 + (task.time_to_solve_sec - duration) / max(task.time_to_solve_sec - fastest, 1))
  end

  # Ordered by score, then less total time, then user id. Cheaters' games don't count.
  defp expected_standings(config, games, cheater_ids, user_ids) do
    games_by_id = Map.new(games, &{&1.id, &1})

    totals =
      config
      |> expected_points(games, cheater_ids)
      |> Enum.reject(fn {{_game_id, user_id}, _points} -> user_id in cheater_ids end)
      |> Enum.group_by(fn {{_game_id, user_id}, _points} -> user_id end)
      |> Map.new(fn {user_id, entries} ->
        games = Enum.map(entries, fn {{game_id, _user_id}, _points} -> Map.fetch!(games_by_id, game_id) end)

        {user_id,
         %{
           score: entries |> Enum.map(&elem(&1, 1)) |> Enum.sum(),
           total_duration_sec: games |> Enum.map(& &1.duration_sec) |> Enum.sum(),
           wins_count: Enum.count(games, &(player_in(&1, user_id).result_percent == 100.0)),
           games_count: length(games)
         }}
      end)

    user_ids
    |> Enum.map(fn id ->
      Map.merge(%{id: id, score: 0, total_duration_sec: 0, wins_count: 0, games_count: 0}, Map.get(totals, id, %{}))
    end)
    |> Enum.sort_by(&{-&1.score, &1.total_duration_sec, &1.id})
    |> Enum.with_index(1)
    |> Enum.map(fn {entry, place} -> Map.put(entry, :place, place) end)
  end

  defp grade_points("open", _entry), do: 0
  defp grade_points(_grade, %{wins_count: wins, score: score}) when wins <= 0 or score <= 0, do: 0
  defp grade_points("pro", %{place: place}), do: Enum.at(@pro_points, place - 1, 2)

  # PERCENTILE_CONT(0.25) with linear interpolation, plus the range of the times.
  defp duration_stats(durations) do
    sorted = Enum.sort(durations)
    position = 0.25 * (length(sorted) - 1)
    low = Enum.at(sorted, floor(position))
    high = Enum.at(sorted, ceil(position))

    %{base: low + (high - low) * (position - floor(position)), min: hd(sorted), max: List.last(sorted)}
  end

  # A game that sets the speed range: won by a human who isn't a cheater.
  defp human_win?(game, cheater_ids) do
    game.state == "game_over" and
      not Enum.any?(game.players, &(&1.is_bot and &1.result == "won")) and
      not Enum.any?(game.players, &(&1.id in cheater_ids and &1.result_percent == 100.0))
  end

  defp lost_to_cheater?(game, player, cheater_ids) do
    has_cheater?(game, cheater_ids) and game.state == "game_over" and player.result_percent < 100.0
  end

  defp has_cheater?(game, cheater_ids), do: Enum.any?(game.players, &(&1.id in cheater_ids))

  defp humans(game), do: Enum.reject(game.players, & &1.is_bot)

  defp player_in(game, user_id), do: Enum.find(game.players, &(&1.id == user_id))

  defp clamp(multiplier), do: multiplier |> max(1.0) |> min(2.0)
end
