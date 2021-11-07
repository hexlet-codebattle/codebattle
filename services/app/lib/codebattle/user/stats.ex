defmodule Codebattle.User.Stats do
  @moduledoc """
    Find user game statistic
  """

  alias Codebattle.{Repo, UserGame, Game}

  import Ecto.Query, warn: false

  def get_game_stats(user_id) do
    query =
      from(ug in UserGame,
        select: {
          ug.result,
          count(ug.id)
        },
        where: ug.user_id == ^user_id,
        where: ug.result in ["won", "lost", "gave_up"],
        group_by: ug.result
      )

    stats = Repo.all(query)

    Map.merge(%{"won" => 0, "lost" => 0, "gave_up" => 0}, Enum.into(stats, %{}))
  end

  def get_completed_games(user_id, params) do
    page_number = params |> Map.get("page", "1") |> String.to_integer()
    page_size = params |> Map.get("page_size", "9") |> String.to_integer()

    query =
      from(
        g in Game,
        order_by: [desc_nulls_last: g.finishes_at],
        inner_join: ug in assoc(g, :user_games),
        inner_join: u in assoc(ug, :user),
        where: g.state == "game_over" and ug.user_id == ^user_id,
        preload: [:users, :user_games]
      )

    page = Repo.paginate(query, %{page: page_number, page_size: page_size})

    %{
      games: page.entries,
      page_info: Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])
    }
  end
end
