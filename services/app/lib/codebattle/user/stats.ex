defmodule Codebattle.User.Stats do
  @moduledoc """
    Find user game statistic
  """

  alias Codebattle.{Repo, UserGame, User}

  import Ecto.Query, warn: false

  def for_user(id) do
    query =
      from(ug in UserGame,
        select: {
          ug.result,
          count(ug.id)
        },
        where: ug.user_id == ^id,
        group_by: ug.result
      )

    stats = Repo.all(query)

    Map.merge(%{"won" => 0, "lost" => 0, "gave_up" => 0}, Enum.into(stats, %{}))
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
