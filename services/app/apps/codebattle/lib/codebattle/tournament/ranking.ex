defmodule Codebattle.Tournament.Ranking do
  @moduledoc false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Ranking.ByClan
  alias Codebattle.Tournament.Ranking.ByPercentile
  alias Codebattle.Tournament.Ranking.Void
  alias Codebattle.Tournament.Storage.Ranking

  @spec get_first(tournament :: Tournament.t(), limit :: pos_integer()) :: list(map())
  def get_first(%{ranking_table: nil}, _num), do: []

  def get_first(tournament, num) do
    get_module(tournament).get_first(tournament, num)
  end

  @spec get_by_player(tournament :: Tournament.t(), player :: Tournament.Player.t()) ::
          map() | nil
  def get_by_player(%{ranking_table: nil}, _player), do: nil

  def get_by_player(tournament, player) do
    get_module(tournament).get_by_player(tournament, player)
  end

  @spec get_nearest_page_by_player(tournament :: Tournament.t(), player :: Tournament.Player.t()) ::
          map()
  def get_nearest_page_by_player(%{ranking_table: nil}, _player),
    do: %{total_entries: 0, page_number: 1, page_size: 10, entries: []}

  def get_nearest_page_by_player(tournament, player) do
    get_module(tournament).get_nearest_page_by_player(tournament, player)
  end

  @spec get_page(tournament :: Tournament.t(), page :: pos_integer(), page_size :: pos_integer()) :: map()
  def get_page(tournament, page, page_size \\ 10)

  def get_page(%{ranking_table: nil}, _page, _page_size),
    do: %{total_entries: 0, page_number: 1, page_size: 10, entries: []}

  def get_page(tournament, page, page_size) do
    get_module(tournament).get_page(tournament, page, page_size)
  end

  @spec add_new_player(Tournament.t(), Tournament.Player.t()) :: Tournament.t()
  def add_new_player(tournament, %{is_bot: true}, _score), do: tournament

  def add_new_player(tournament, player) do
    get_module(tournament).add_new_player(tournament, player)
  end

  @spec drop_player(Tournament.t(), player_id :: pos_integer()) :: Tournament.t()
  def drop_player(tournament, player_id) do
    if get_module(tournament) == ByPercentile do
      Ranking.drop_player(tournament, player_id)
    end
  end

  @spec update_player_result(Tournament.t(), Tournament.Player.t(), non_neg_integer()) ::
          Tournament.t()
  def update_player_result(tournament, %{is_bot: true}, _score), do: tournament

  def update_player_result(tournament, player, score) do
    get_module(tournament).update_player_result(tournament, player, score)
  end

  @spec set_ranking(Tournament.t()) :: Tournament.t()
  def set_ranking(tournament) do
    get_module(tournament).set_ranking(tournament)
  end

  @spec set_ranking_to_ets(Tournament.t()) :: Tournament.t()
  def set_ranking_to_ets(tournament) do
    get_module(tournament).set_ranking_to_ets(tournament)
    tournament
  end

  @spec preload_event_ranking(Tournament.t()) :: Tournament.t()
  def preload_event_ranking(%{use_event_ranking: true, event_id: event_id} = tournament) when not is_nil(event_id) do
    ranking = get_module(tournament).get_event_ranking(tournament)

    Ranking.put_ranking(tournament, ranking)

    event_ranking = Map.new(ranking, fn %{id: id} = item -> {id, item} end)
    Map.put(tournament, :event_ranking, event_ranking)
  end

  def preload_event_ranking(t), do: t

  @spec create_table(pos_integer()) :: term()
  def create_table(tournament_id) do
    Ranking.create_table(tournament_id)
  end

  defp get_module(%{ranking_type: "by_clan"}), do: ByClan
  defp get_module(%{ranking_type: "by_percentile"}), do: ByPercentile
  defp get_module(%{ranking_type: "void"}), do: Void
  defp get_module(_tournament), do: ByPercentile
end
