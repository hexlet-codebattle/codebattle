defmodule Codebattle.Tournament.Ranking do
  alias Codebattle.Tournament.Ranking.ByClan
  alias Codebattle.Tournament.Ranking.ByPlayer

  def update_player_result(tournament, player) do
    get_module(tournament).update_player_result(tournament, player)
  end

  def get_module(tournament = %{ranking_type: "by_clan"}), do: ByClan
  def get_module(_), do: Basic
end
