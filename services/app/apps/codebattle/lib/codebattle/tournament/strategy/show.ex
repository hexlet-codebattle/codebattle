defmodule Codebattle.Tournament.Show do
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament

  @impl Tournament.Base
  def complete_players(tournament) do
    tournament
  end

  @impl Tournament.Base
  def default_meta(), do: %{}

  @impl Tournament.Base
  def calculate_round_results(t), do: t

  @impl Tournament.Base
  def build_round_pairs(tournament) do
    {tournament, []}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament), do: final_round?(tournament)

  def create_match(tournament, params) do
    :noop
  end

  defp final_round?(tournament) do
    tournament
  end
end
