defmodule Codebattle.User.Stats do
  @moduledoc """
    Find user game statistic
  """

  alias Codebattle.{Repo, UserGame, User}

  import Ecto.Query, warn: false

  def for_user(user_id) do
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
