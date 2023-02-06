defmodule Codebattle.User.Achievements do
  @moduledoc """
    Count user achievements
  """
  alias Codebattle.{Repo, UserGame}

  import Ecto.Query, warn: false

  def recalculate_achievements(user) do
    {user.achievements, user}
    |> count_played_games
    |> count_wins
    |> elem(0)
  end

  def count_played_games({achievements, user}) do
    query =
      from(ug in UserGame,
        select: ug.result,
        where: ug.user_id == ^user.id
      )

    user_games = Repo.aggregate(query, :count, :id)

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

      user_games >= 100 && user_games < 500 ->
        if Enum.member?(achievements, "played_hundred_games") do
          {achievements, user}
        else
          {achievements ++ ["played_hundred_games"], user}
        end

      user_games >= 500 ->
        if Enum.member?(achievements, "played_five_hundred_games") do
          {achievements, user}
        else
          {achievements ++ ["played_five_hundred_games"], user}
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
        {achievements ++ ["bot"], user}

      true ->
        {achievements, user}
    end
  end

  def count_wins({achievements, user}) do
    query =
      from(ug in UserGame,
        select: {
          ug.lang,
          count(ug.id)
        },
        where: ug.user_id == ^user.id and ug.result == "won" and not is_nil(ug.lang),
        group_by: ug.lang
      )

    languages = Repo.all(query) |> Enum.into(%{}) |> Map.keys()

    exist_achievement =
      Enum.filter(achievements, fn x -> String.contains?(x, "win_games_with") end) |> Enum.at(0)

    new_achievement = "win_games_with?#{Enum.join(languages, "_")}"

    if Enum.count(languages) >= 3 do
      if new_achievement !== exist_achievement do
        new_list = List.delete(achievements, exist_achievement)
        {new_list ++ [new_achievement], user}
      else
        {achievements, user}
      end
    else
      {achievements, user}
    end
  end
end
