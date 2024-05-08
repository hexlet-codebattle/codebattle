defmodule Codebattle.Tournament.Ranking do
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Ranking.ByClan
  alias Codebattle.Tournament.Ranking.ByPlayer
  alias Codebattle.Tournament.Ranking.ByPlayer95thPercentile
  alias Codebattle.Tournament.Storage.Ranking

  @spec get_first(tournament :: Tournament.t(), limit :: pos_integer()) :: list(map())
  def get_first(tournament, num) do
    get_module(tournament).get_first(tournament, num)
  end

  @spec get_nearest_page_by_player(tournament :: Tournament.t(), player :: Tournament.Player.t()) ::
          map()
  def get_nearest_page_by_player(tournament, player) do
    get_module(tournament).get_nearest_page_by_player(tournament, player)
  end

  @spec get_page(tournament :: Tournament.t(), page :: pos_integer()) :: map()
  def get_page(tournament, page) do
    get_module(tournament).get_page(tournament, page)
  end

  @spec update_player_result(Tournament.t(), Tournament.Player.t(), non_neg_integer()) ::
          Tournament.t()
  def update_player_result(tournament, player, score) do
    get_module(tournament).update_player_result(tournament, player, score)
  end

  @spec set_ranking(Tournament.t()) :: Tournament.t()
  def set_ranking(tournament) do
    get_module(tournament).set_ranking(tournament)
  end

  @spec add_new_player(Tournament.t(), Tournament.Player.t()) :: Tournament.t()
  def add_new_player(tournament, player) do
    get_module(tournament).add_new_player(tournament, player)
  end

  @spec create_table(pos_integer()) :: term()
  def create_table(tournament_id) do
    Ranking.create_table(tournament_id)
  end

  defp get_module(%{ranking_type: "by_clan"}), do: ByClan
  defp get_module(%{ranking_type: "by_player_95th_percentile"}), do: ByPlayer95thPercentile
  defp get_module(%{ranking_type: "by_player"}), do: ByPlayer
  defp get_module(_tournament), do: ByPlayer
end
