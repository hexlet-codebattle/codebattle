defmodule Codebattle.User.Achievements do
  @moduledoc """
  Count user achievements
"""
  alias Codebattle.{Repo, UserGame}
  alias Codebattle.User.Stats
  alias Codebattle.GameProcess.FsmHelpers

  import Ecto.Query, warn: false

  def recalculate_achievements(fsm, id) do
    player = FsmHelpers.get_player(fsm, id)
    {player.achievements, id}
    |>played_ten_games
    |>elem(0)
  end

  def played_ten_games({achievements, id}) do
    query = from ug in UserGame,
                 select: ug.result,
                 where: ug.user_id == ^id
    data = Repo.all(query)
    user_games = Enum.into(data, [])
    cond do
      Enum.member?(achievements, "played_ten_games") ->
        {achievements, id}
      Enum.count(user_games) >= 10 ->
        {achievements ++ ["played_ten_games"], id}
      true -> {achievements, id}
    end
  end
end
