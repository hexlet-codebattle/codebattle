defmodule Codebattle.User.Stats do
  @moduledoc """
    Find user game statistic
  """

  alias Codebattle.Repo
  alias Codebattle.UserGame

  import Ecto.Query

  @default_game_stats %{"won" => 0, "lost" => 0, "gave_up" => 0}

  def get_game_stats(user_id) do
    user_games_stats =
      from(ug in UserGame,
        select: %{result: ug.result, lang: ug.lang, count: count(ug.id)},
        where: ug.user_id == ^user_id,
        where: ug.result in ["won", "lost", "gave_up"],
        group_by: [ug.result, ug.lang]
      )
      |> Repo.all()

    games_stats =
      user_games_stats
      |> Enum.group_by(& &1.result, & &1.count)
      |> Map.new(fn {k, v} -> {k, Enum.sum(v)} end)
      |> Map.merge(@default_game_stats, fn _k, v1, _v2 -> v1 end)

    %{games: games_stats, all: user_games_stats}
  end
end
