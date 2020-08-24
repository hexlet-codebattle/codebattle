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

  def get_user_rank(user_id) do
    query =
      from(u in User,
        order_by: {:desc, :rating},
        join: ug in UserGame,
        on: u.id == ug.user_id,
        group_by: u.id,
        select: u.id
      )

    sorted_ids = Repo.all(query)

    case Enum.find_index(sorted_ids, fn id -> id == String.to_integer(user_id) end) do
      nil -> -1
      id -> id + 1
    end
  end

  def get_users_rating(params) do
    query =
      from(users in User,
        order_by: {:desc, :rating},
        preload: [:user_games]
      )

    page =
      query
      |> Repo.paginate(params)

    %{users: page.entries, page: page}
  end
end
