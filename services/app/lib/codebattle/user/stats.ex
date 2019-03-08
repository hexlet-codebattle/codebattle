defmodule Codebattle.User.Stats do
  @moduledoc """
    Find user game statistic
  """

  alias Codebattle.{Repo, UserGame}

  import Ecto.Query, warn: false

  def for_user(id) do
    case id do
      "bot" ->
        %{"won" => 30, "lost" => 0, "gave_up" => 0}

      user_id ->
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
  end
end
