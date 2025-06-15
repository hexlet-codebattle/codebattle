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
  def calculate_round_results(t), do: t

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

  # pick 100 winners from 100 pairs.
  # build 64 pairs with 100 winners + 28 top losers, with respect for seeding
  # build 36 pairs for shuffled losers
  def build_round_pairs(%{current_round_position: 1} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 0)

    {winner_ids, loser_ids} =
      tournament
      |> get_round_matches(0)
      |> Enum.sort_by(& &1.id)
      |> Enum.take(100)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && {p1_id, p2_id}) || {p2_id, p1_id}
      end)
      |> Enum.unzip()

    # Get top 28 players from ranking who are not winners
    {rest_top_ids, bottom_ids} =
      ranking
      |> Map.values()
      |> Enum.filter(&(&1.id in loser_ids))
      |> Enum.sort_by(&{-&1.score, &1.id})
      |> Enum.map(& &1.id)
      |> Enum.split(28)

    winner_ids = winner_ids ++ rest_top_ids

    {seeded_ids, unseeded_ids} = Enum.split(winner_ids, 32)

    shuffled_unseeded_ids = Enum.shuffle(unseeded_ids)
    {unseeded_for_seeded_ids, rest_unseeded_ids} = Enum.split(shuffled_unseeded_ids, 32)

    seeded_pair_ids =
      seeded_ids
      |> Enum.zip(unseeded_for_seeded_ids)
      |> Enum.map(fn {seeded_id, unseeded_id} -> [seeded_id, unseeded_id] end)

    unseeded_pair_ids =
      rest_unseeded_ids
      |> Enum.chunk_every(2)
      |> Enum.map(fn [id1, id2] -> [id1, id2] end)

    bottom_pair_ids =
      bottom_ids
      |> Enum.shuffle()
      |> Enum.chunk_every(2)
      |> Enum.map(fn [id1, id2] -> [id1, id2] end)

    player_pair_ids = seeded_pair_ids ++ unseeded_pair_ids ++ bottom_pair_ids

    player_pairs =
      Enum.map(player_pair_ids, fn [id1, id2] -> [get_player(tournament, id1), get_player(tournament, id2)] end)

    {tournament, player_pairs}
  end

  # pick 64 winners from 128 top pairs.
  # build 32 pairs with 32 seeded players and 32 shuffled players from 64 winners
  # build 68 pairs for shuffled bottom and losers
  def build_round_pairs(%{current_round_position: 2} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 1)

    # Get winners from first 64 matches
    top_winner_ids =
      tournament
      |> get_round_matches(1)
      |> Enum.sort_by(& &1.id)
      # Take only first 64 matches
      |> Enum.take(64)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    {seeded_winners_ids, unseeded_winners_ids} = Enum.split(top_winner_ids, 32)

    top_winner_pair_ids =
      seeded_winners_ids
      |> Enum.zip(Enum.shuffle(unseeded_winners_ids))
      |> Enum.map(fn {seeded_id, unseeded_id} -> [seeded_id, unseeded_id] end)

    # Get all remaining players
    remaining_ids = ranking |> Map.values() |> Enum.map(& &1.id) |> Kernel.--(top_winner_ids)

    # Shuffle remaining players
    shuffled_remaining_ids = Enum.shuffle(remaining_ids)

    # Pair the rest of the players randomly
    remaining_pair_ids = Enum.chunk_every(shuffled_remaining_ids, 2)

    # Combine all pairs
    player_pair_ids = top_winner_pair_ids ++ remaining_pair_ids

    # Convert IDs to player objects
    player_pairs =
      Enum.map(player_pair_ids, fn ids ->
        Enum.map(ids, &get_player(tournament, &1))
      end)

    {tournament, player_pairs}
  end

  # pick 16 top winners from 32 winners
  # build 8 pairs with 8 seeded players and 8 shuffled players from 16 winners
  # build 92 pairs for bottom and losers
  def build_round_pairs(%{current_round_position: 3} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 2)

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

    # Split into seeded and unseeded
    {seeded_ids, unseeded_ids} = Enum.split(top_16_winner_ids, 8)

    # Create pairs with seeded and shuffled unseeded players
    top_winner_pair_ids =
      seeded_ids
      |> Enum.zip(Enum.shuffle(unseeded_ids))
      |> Enum.map(fn {seeded_id, unseeded_id} -> [seeded_id, unseeded_id] end)

    # Get all remaining players
    remaining_ids = ranking |> Map.values() |> Enum.map(& &1.id) |> Kernel.--(top_16_winner_ids)

    # Shuffle remaining players
    shuffled_remaining_ids = Enum.shuffle(remaining_ids)

    # Pair the rest of the players randomly
    remaining_pair_ids = Enum.chunk_every(shuffled_remaining_ids, 2)

    # Combine all pairs
    player_pair_ids = top_winner_pair_ids ++ remaining_pair_ids

    # Convert IDs to player objects
    player_pairs =
      Enum.map(player_pair_ids, fn ids ->
        Enum.map(ids, &get_player(tournament, &1))
      end)

    {tournament, player_pairs}
  end

  # pick 8 top winners from 16 winners, and from this 8 pick top rated 6 winners
  # from rest 194 players pick 2 and add them to the top
  # build 96 pairs for bottom and losers with shuffle
  def build_round_pairs(%{current_round_position: 4} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 3)
    total_ranking = TournamentResult.get_user_ranking(tournament)

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
      |> Enum.filter(&(&1.id not in top_6_winner_ids))
      |> Enum.sort_by(&{-&1.score, &1.id})
      |> Enum.map(& &1.id)
      |> Enum.take(2)

    # Combine top 6 winners with top 2 remaining players
    top_8_ids = top_6_winner_ids ++ top_2_remaining_ids

    # Get all remaining players
    remaining_ids = ranking |> Map.values() |> Enum.map(& &1.id) |> Kernel.--(top_8_ids)

    # Create 4 pairs from top 8 players
    top_pair_ids = top_8_ids |> Enum.shuffle() |> Enum.chunk_every(2)

    # Shuffle and pair the rest of the players
    remaining_pair_ids = remaining_ids |> Enum.shuffle() |> Enum.chunk_every(2)

    # Combine all pairs
    player_pair_ids = top_pair_ids ++ remaining_pair_ids

    # Convert IDs to player objects
    player_pairs =
      Enum.map(player_pair_ids, fn ids ->
        Enum.map(ids, &get_player(tournament, &1))
      end)

    {tournament, player_pairs}
  end

  # pick 4 winners from top matches
  # build rest shuffled players into pairs
  def build_round_pairs(%{current_round_position: 5} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 4)

    # Get winners from first 4 matches
    top_winner_ids =
      tournament
      |> get_round_matches(4)
      |> Enum.sort_by(& &1.id)
      # Take only first 4 matches
      |> Enum.take(4)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    # Create 2 pairs from top 4 players
    top_pair_ids = Enum.chunk_every(Enum.shuffle(top_winner_ids), 2)

    # Get all remaining players
    remaining_ids = ranking |> Map.values() |> Enum.map(& &1.id) |> Kernel.--(top_winner_ids)

    # Shuffle remaining players
    shuffled_remaining_ids = Enum.shuffle(remaining_ids)

    # Pair the rest of the players randomly
    remaining_pair_ids = Enum.chunk_every(shuffled_remaining_ids, 2)

    # Combine all pairs
    player_pair_ids = top_pair_ids ++ remaining_pair_ids

    # Convert IDs to player objects
    player_pairs =
      Enum.map(player_pair_ids, fn ids ->
        Enum.map(ids, &get_player(tournament, &1))
      end)

    {tournament, player_pairs}
  end

  # pick 2 winners from top matches
  # build rest shuffled players into pairs
  def build_round_pairs(%{current_round_position: 6} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 5)

    # Get winners from first 2 matches
    top_winner_ids =
      tournament
      |> get_round_matches(5)
      |> Enum.sort_by(& &1.id)
      # Take only first 2 matches
      |> Enum.take(2)
      |> Enum.map(fn match ->
        [p1_id, p2_id] = match.player_ids
        (get_in(ranking, [p1_id, :score]) >= get_in(ranking, [p2_id, :score]) && p1_id) || p2_id
      end)

    # Create 1 pair from top 2 players
    top_pair_ids = [top_winner_ids]

    # Get all remaining players
    remaining_ids = ranking |> Map.values() |> Enum.map(& &1.id) |> Kernel.--(top_winner_ids)

    # Shuffle remaining players
    shuffled_remaining_ids = Enum.shuffle(remaining_ids)

    # Pair the rest of the players randomly
    remaining_pair_ids = Enum.chunk_every(shuffled_remaining_ids, 2)

    # Combine all pairs
    player_pair_ids = top_pair_ids ++ remaining_pair_ids

    # Convert IDs to player objects
    player_pairs =
      Enum.map(player_pair_ids, fn ids ->
        Enum.map(ids, &get_player(tournament, &1))
      end)

    {tournament, player_pairs}
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

  defp has_more_games_in_round?(%{task_provider: "task_pack_per_round", round_task_ids: round_task_ids}, game_params) do
    game_params.task_id != List.last(round_task_ids)
  end

  defp has_more_games_in_round?(_tournament, _game_params), do: false
end
