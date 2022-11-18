defmodule Codebattle.Game.Query do
  alias Codebattle.Game
  alias Codebattle.Repo

  import Ecto.Query

  @spec get_completed_games(
          %{optional(:user_id) => integer()},
          %{
            page: integer(),
            page_size: integer()
          }
        ) :: %{games: [map()], page_info: map()}
  def get_completed_games(filters, params) do
    result =
      completed_games_base_query()
      |> filter_completed_games(filters)
      |> Repo.paginate(%{page: params.page_number, page_size: params.page_size})

    %{
      games: result.entries,
      page_info: Map.take(result, [:page_number, :page_size, :total_entries, :total_pages])
    }
  end

  defp completed_games_base_query() do
    from(
      g in Game,
      distinct: true,
      order_by: [desc_nulls_last: g.finishes_at],
      inner_join: ug in assoc(g, :user_games),
      inner_join: u in assoc(ug, :user),
      where: g.state == "game_over",
      preload: [:users, :user_games]
    )
  end

  defp filter_completed_games(query, %{user_id: user_id}) do
    where(query, [g, ug], ug.user_id == ^user_id)
  end

  defp filter_completed_games(query, %{}), do: query
end
