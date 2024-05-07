defmodule Codebattle.Tournament.Ranking do
  alias Codebattle.Tournament.Ranking.ByClan
  alias Codebattle.Tournament.Ranking.ByPlayer
  alias Codebattle.Tournament.Ranking.ByPlayer95thPercentile
  alias Codebattle.Tournament.Storage.Ranking

  def get_first(tournament, num) do
    get_module(tournament).get_first(tournament, num)
  end

  def get_closest_page(tournament, entity_id) do
    get_module(tournament).get_closest_page(tournament, entity_id)
  end

  def get_clans_by_page(tournament, page) do
    get_module(tournament).get_clans_by_page(tournament, page)
  end

  def update_player_result(tournament, player) do
    get_module(tournament).update_player_result(tournament, player)
  end

  def set_ranking(tournament) do
    get_module(tournament).set_ranking(tournament)
  end

  def add_new_player(tournament, player) do
    get_module(tournament).add_new_player(tournament, player)
  end

  def create_table(tournament_id) do
    Ranking.create_table(tournament_id)
  end

  def get_module(%{ranking_type: "by_clan"}), do: ByClan
  def get_module(%{ranking_type: "by_player_95th_percentile"}), do: ByPlayer95thPercentile
  def get_module(%{ranking_type: "by_player"}), do: ByPlayer
  def get_module(_tournament), do: ByPlayer
end
