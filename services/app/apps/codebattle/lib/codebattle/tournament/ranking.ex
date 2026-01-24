defmodule Codebattle.Tournament.Ranking do
  @moduledoc false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Ranking.ByClan
  alias Codebattle.Tournament.Ranking.ByUser
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

  @spec get_by_id(tournament :: Tournament.t(), player_id :: pos_integer()) :: map() | nil
  def get_by_id(%{ranking_table: nil}, _player_id), do: nil

  def get_by_id(tournament, player_id) do
    Ranking.get_by_id(tournament, player_id)
  end

  @spec get_nearest_page_by_player(tournament :: Tournament.t(), player :: Tournament.Player.t()) ::
          map()
  def get_nearest_page_by_player(%{ranking_table: nil}, _player),
    do: %{total_entries: 0, page_number: 1, page_size: 10, entries: []}

  def get_nearest_page_by_player(tournament, player) do
    get_module(tournament).get_nearest_page_by_player(tournament, player)
  end

  @spec get_page(tournament :: Tournament.t(), page :: pos_integer(), page_size :: pos_integer()) ::
          map()
  def get_page(tournament, page, page_size \\ 10)

  def get_page(%{ranking_table: nil} = tournament, page, page_size) do
    if tournament.ranking_type == "by_user" do
      players =
        tournament
        |> Helpers.get_players()
        |> Enum.reject(& &1.is_bot)
        |> Enum.sort_by(fn player ->
          cond do
            is_integer(player.place) and player.place > 0 -> {0, player.place}
            is_integer(player.wr_joined_at) -> {1, player.wr_joined_at}
            true -> {2, player.id}
          end
        end)

      entries =
        players
        |> Enum.with_index(1)
        |> Enum.map(fn {player, place} ->
          %{
            id: player.id,
            place: place,
            score: player.score || 0,
            lang: player.lang,
            name: player.name,
            clan_id: player.clan_id,
            clan: player.clan
          }
        end)

      total_entries = length(entries)
      start_index = (page - 1) * page_size

      %{
        total_entries: total_entries,
        page_number: page,
        page_size: page_size,
        entries: Enum.slice(entries, start_index, page_size)
      }
    else
      %{total_entries: 0, page_number: page, page_size: page_size, entries: []}
    end
  end

  def get_page(tournament, page, page_size) do
    get_module(tournament).get_page(tournament, page, page_size)
  end

  @spec add_new_player(Tournament.t(), Tournament.Player.t()) :: Tournament.t()
  def add_new_player(tournament, %{is_bot: true}, _score), do: tournament

  def add_new_player(tournament, player) do
    get_module(tournament).add_new_player(tournament, player)
  end

  @spec drop_player(Tournament.t(), player_id :: pos_integer()) :: nil | :ok | non_neg_integer()
  def drop_player(tournament, player_id) do
    if get_module(tournament) == ByUser do
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

  @spec create_table(pos_integer()) :: term()
  def create_table(tournament_id) do
    Ranking.create_table(tournament_id)
  end

  defp get_module(%{ranking_type: "by_clan"}), do: ByClan
  defp get_module(%{ranking_type: "by_user"}), do: ByUser
end
