defmodule Codebattle.Tournament.Top200 do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult

  @impl Tournament.Base
  def complete_players(tournament), do: tournament

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
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

  def build_round_pairs(%{current_round_position: 1} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 0) |> dbg()
    winner_ids =
      tournament
      |> get_round_matches(0)
      |> Enum.sort_by(& &1.id)
      |> Enum.take(100)
      |> Enum.map(fn match ->
       [p1_id, p2_id] = match.player_ids
       (get_in(ranking, [p1_id, :place]) < get_in(ranking, [p2_id, :place]) && p1_id) || p2_id
      end)

    # Get top players from ranking who are not winners
   {rest_top_ids, bottom_ids} =
      ranking
      |> Map.values()
      |> Enum.reject(&(&1.id in winner_ids))
      |> Enum.sort_by(& &1.place, :asc)
      |> Enum.map(& &1.id)
      |> Enum.split(28)

    rest_ids |> dbg()


    # get_players(tournament) |> Enum.sort_by(& &1.place, :asc) |> Enum.take(3) |> IO.inspect()
    # last_round_init_matches =
    #   tournament
    #   |> get_round_matches(tournament.current_round_position - 1)
    #   |> Enum.filter(&(!&1.rematch))
    #   |> Enum.sort_by(& &1.id)

    raise "lol"
  end

  def build_round_pairs(tournament) do
    # winner_ids = Enum.map(last_round_matches, &pick_winner_id(&1))

    # player_pairs =
    #   tournament
    #   |> get_players(winner_ids)
    #   |> Enum.chunk_every(2)

    # {tournament, player_pairs}
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
