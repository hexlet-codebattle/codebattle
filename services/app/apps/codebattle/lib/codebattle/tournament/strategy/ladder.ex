defmodule Codebattle.Tournament.Ladder do
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(t), do: t

  @impl Tournament.Base
  def default_meta(), do: %{rounds_limit: 3}

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament = %{current_round: 0}) do
    player_pairs =
      tournament
      |> get_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    last_round_matches =
      tournament
      |> get_round_matches(tournament.current_round - 1)
      |> Enum.sort_by(& &1.id)

    winner_ids = Enum.map(last_round_matches, &pick_winner_id(&1))

    player_pairs =
      tournament
      |> get_players(winner_ids)
      |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round
  end
end
