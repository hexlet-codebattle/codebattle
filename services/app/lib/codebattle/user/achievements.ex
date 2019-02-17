defmodule Codebattle.User.Achievements do
  @moduledoc """
    Count user achievements
  """
  alias Codebattle.{Repo, UserGame}
  alias Codebattle.User.Stats

  import Ecto.Query, warn: false

  def recalculate_achievements(user) do
    {user.achievements, user}
    |> count_played_games
    |> elem(0)
  end

  def count_played_games({achievements, user}) do
    query =
      from(ug in UserGame,
        select: ug.result,
        where: ug.user_id == ^user.id
      )

    data = Repo.all(query)
    user_games = Enum.count(Enum.into(data, []))

    cond do
      user_games >= 10 && user_games < 50 ->
        if Enum.member?(achievements, "played_ten_games") do
          {achievements, user}
        else
          {achievements ++ ["played_ten_games"], user}
        end

      user_games >= 50 && user_games < 100 ->
        if Enum.member?(achievements, "played_fifty_games") do
          {achievements, user}
        else
          {achievements ++ ["played_fifty_games"], user}
        end

      user_games >= 100 ->
        if Enum.member?(achievements, "played_hundred_games") do
          {achievements, user}
        else
          {achievements ++ ["played_hundred_games"], user}
        end

      true ->
        {achievements, user}
    end
  end

  def check_bot({achievements, user}) do
    cond do
      Enum.member?(achievements, "bot") ->
        {achievements, user}

      user.bot == true ->
        {{achievements ++ ["bot"], user}}

      true ->
        {achievements, user}
    end
  end
end
