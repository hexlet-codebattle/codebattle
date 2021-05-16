defmodule Codebattle.User.Stats do
  @moduledoc """
    Find user game statistic
  """

  alias Codebattle.{Repo, UserGame, Game, User}

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

  def get_completed_games(user_id) do
    query =
      from(
        g in Game,
        order_by: [desc_nulls_last: g.finishs_at],
        limit: 5,
        inner_join: ug in assoc(g, :user_games),
        inner_join: u in assoc(ug, :user),
        where: g.state == "game_over" and ug.user_id == ^user_id,
        preload: [:users, :user_games]
      )

    Repo.all(query)
  end
end
