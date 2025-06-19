defmodule Codebattle.Tournament.Top200 do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult

  @impl Tournament.Base
  def complete_players(tournament) do
    # just for the UI test
    # users =
    #   Codebattle.User
    #   |> Codebattle.Repo.all()
    #   |> Enum.filter(&(&1.is_bot == false and &1.subscription_type != :admin))
    #   |> Enum.take(199)

    # add_players(tournament, %{users: users})
    tournament
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def calculate_round_results(%{current_round_position: 0} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 0)
    players = get_players(tournament)

    {winner_ids, loser_ids} =
      tournament
      |> get_round_matches(0)
      |> Enum.uniq_by(& &1.player_ids)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids

        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && {p1_id, p2_id}) ||
          {p2_id, p1_id}
      end)
      |> Enum.unzip()

    # Get top 28 players from ranking who are not winners
    {rest_top_ids, _consolation_draw_ids} =
      ranking
      |> Map.values()
      |> Enum.filter(&(&1.id in loser_ids))
      |> Enum.sort_by(&{-&1.score, &1.id})
      |> Enum.map(& &1.id)
      |> Enum.split(28)

    main_draw_ids = winner_ids ++ rest_top_ids

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | in_main_draw: player.id in main_draw_ids,
          score: get_in(ranking, [player.id, :score]) || 0,
          place: get_in(ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 1} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 1)
    players = get_players(tournament)

    # Get winners from first 64 matches
    winner_ids =
      tournament
      |> get_round_matches(1)
      |> Enum.sort_by(& &1.id)
      # Take only first 64 matches
      |> Enum.take(64)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | in_main_draw: player.id in winner_ids,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 2} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 2)
    players = Tournament.Players.get_players(tournament)

    # Get winners from first 32 matches
    top_winner_ids =
      tournament
      |> get_round_matches(2)
      |> Enum.sort_by(& &1.id)
      # Take only first 32 matches
      |> Enum.take(32)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    # Take top 16 winners based on ranking
    top_16_winner_ids =
      ranking
      |> Map.values()
      |> Enum.filter(&(&1.id in top_winner_ids))
      |> Enum.sort_by(&{-&1.score, &1.id})
      |> Enum.map(& &1.id)
      |> Enum.take(16)

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | in_main_draw: player.id in top_16_winner_ids,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 3} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 3)
    total_ranking = TournamentResult.get_user_ranking(tournament)
    players = get_players(tournament)

    # Get winners from first 8 matches
    top_8_winner_ids =
      tournament
      |> get_round_matches(3)
      |> Enum.sort_by(& &1.id)
      # Take only first 8 matches
      |> Enum.take(8)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    # Take top 6 winners based on ranking
    top_6_winner_ids =
      ranking
      |> Map.values()
      |> Enum.filter(&(&1.id in top_8_winner_ids))
      |> Enum.sort_by(&{-&1.score, &1.id})
      |> Enum.map(& &1.id)
      |> Enum.take(6)

    # Pick top 2 from remaining players
    top_2_remaining_ids =
      total_ranking
      |> Map.values()
      |> Enum.filter(&(&1.id not in top_6_winner_ids))
      |> Enum.sort_by(&{-&1.score, &1.id})
      |> Enum.map(& &1.id)
      |> Enum.take(2)

    # Combine top 6 winners with top 2 remaining players
    top_8_ids = top_6_winner_ids ++ top_2_remaining_ids

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | in_main_draw: player.id in top_8_ids,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 4} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 4)

    # Get winners from first 4 matches
    top_4_winner_ids =
      tournament
      |> get_round_matches(4)
      |> Enum.sort_by(& &1.id)
      # Take only first 4 matches
      |> Enum.take(4)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    Enum.each(Tournament.Players.get_players(tournament), fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | in_main_draw: player.id in top_4_winner_ids,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 5} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 5)
    players = get_players(tournament)

    # Get winners from first 2 matches
    top_2_winner_ids =
      tournament
      |> get_round_matches(5)
      |> Enum.sort_by(& &1.id)
      # Take only first 2 matches
      |> Enum.take(2)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | in_main_draw: player.id in top_2_winner_ids,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 6} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 6)
    total_ranking = TournamentResult.get_user_ranking(tournament)
    players = get_players(tournament)

    # Get winners from first 2 matches
    top_1_winner_ids =
      tournament
      |> get_round_matches(5)
      |> Enum.sort_by(& &1.id)
      # Take only first 2 matches
      |> Enum.take(1)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | in_main_draw: player.id in top_1_winner_ids,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  @impl Tournament.Base
  # build 200 players into 100 pairs with 32 seeded players, rest shuffled
  def build_round_pairs(%{current_round_position: 0} = tournament) do
    players = get_players(tournament)
    {seeded, unseeded} = players |> Enum.sort_by(& &1.id) |> Enum.split(32)

    # Shuffle unseeded players to randomize pairings
    shuffled_unseeded = Enum.shuffle(unseeded)

    # Take first 32 unseeded players to pair with seeded players
    {unseeded_for_seeded, rest_unseeded} = Enum.split(shuffled_unseeded, 32)

    # Pair each seeded player with an unseeded player
    seeded_pairs =
      seeded
      |> Enum.zip(unseeded_for_seeded)
      |> Enum.map(fn {seeded_player, unseeded_player} -> [seeded_player, unseeded_player] end)

    # Pair remaining unseeded players with each other
    unseeded_pairs = Enum.chunk_every(rest_unseeded, 2)

    player_pairs = seeded_pairs ++ unseeded_pairs

    {tournament, player_pairs}
  end

  # build 128 players into 64 pairs with 32 seeded players, rest shuffled
  def build_round_pairs(%{current_round_position: 1} = tournament) do
    players = get_players(tournament)

    {main_draw_players, consolation_draw_players} = Enum.split_with(players, & &1.in_main_draw)

    {seeded, unseeded} = Enum.split(main_draw_players, 32)

    {unseeded_for_seeded, rest_unseeded} = unseeded |> Enum.shuffle() |> Enum.split(32)

    seeded_pairs =
      seeded
      |> Enum.zip(unseeded_for_seeded)
      |> Enum.map(fn {p1, p2} -> [p1, p2] end)

    unseeded_pairs = Enum.chunk_every(rest_unseeded, 2)

    consolation_pairs =
      consolation_draw_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, seeded_pairs ++ unseeded_pairs ++ consolation_pairs}
  end

  # build 64 players into 32 pairs with 32 seeded players, rest shuffled
  def build_round_pairs(%{current_round_position: 2} = tournament) do
    players = get_players(tournament)

    {main_draw_players, consolation_draw_players} = Enum.split_with(players, & &1.in_main_draw)

    {seeded, unseeded} = Enum.split(main_draw_players, 32)

    main_draw_pairs =
      seeded
      |> Enum.zip(Enum.shuffle(unseeded))
      |> Enum.map(fn {p1, p2} -> [p1, p2] end)

    consolation_pairs =
      consolation_draw_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, main_draw_pairs ++ consolation_pairs}
  end

  # chank shuffled players into pairs
  def build_round_pairs(tournament) do
    players = get_players(tournament)

    {main_draw_players, consolation_draw_players} = Enum.split_with(players, & &1.in_main_draw)

    main_draw_pairs =
      main_draw_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    consolation_pairs =
      consolation_draw_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, main_draw_pairs ++ consolation_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    timeout_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms)
    wait_type = get_wait_type(tournament, game_params)

    if wait_type == "rematch" do
      Process.send_after(
        self(),
        {:start_rematch, game_params.ref, tournament.current_round_position},
        timeout_ms
      )
    end

    Codebattle.PubSub.broadcast("tournament:game:wait", %{
      game_id: game_params.game_id,
      type: wait_type
    })

    tournament
  end

  @impl Tournament.Base
  def finish_round_after_match?(
        %{
          task_provider: "task_pack_per_round",
          round_task_ids: round_task_ids,
          current_round_position: current_round_position
        } = tournament
      ) do
    matches = get_round_matches(tournament, current_round_position)

    task_index = round(2 * Enum.count(matches) / players_count(tournament))

    !Enum.any?(matches, &(&1.state == "playing")) and
      task_index == Enum.count(round_task_ids)
  end

  @impl Tournament.Base
  def set_ranking(tournament) do
    Tournament.Ranking.set_ranking(tournament)
  end

  defp get_wait_type(tournament, game_params) do
    # min_seconds_to_rematch = 7 + round(timeout_ms / 1000)

    if has_more_games_in_round?(tournament, game_params) do
      "rematch"
    else
      if finish_tournament?(tournament) do
        "tournament"
      else
        "round"
      end
    end
  end

  defp has_more_games_in_round?(
         %{task_provider: "task_pack_per_round", round_task_ids: round_task_ids},
         game_params
       ) do
    game_params.task_id != List.last(round_task_ids)
  end

  defp has_more_games_in_round?(_tournament, _game_params), do: false
end
