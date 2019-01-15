defmodule Codebattle.User.UserWithStats do
  @moduledoc """
    Find user info with game statistic
  """

  alias Codebattle.{Repo, User, UserGame}

  import Ecto.Query, warn: false

  def all do
    from u in User,
         left_join: w in assoc(u, :user_games),
         select: %{
           u |
           wins: fragment("SUM(CASE WHEN ? = ? THEN 1 ELSE 0 END)", w.result, "won"),
           loses: fragment("SUM(CASE WHEN ? = ? THEN 1 ELSE 0 END)", w.result, "lost"),
           leaves: fragment("SUM(CASE WHEN ? = ? THEN 1 ELSE 0 END)", w.result, "leave")
         },
         group_by: u.id
  end

  def one(id) do
    where(all(), [u], u.id == ^id)
  end
end
