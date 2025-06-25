defmodule Codebattle.User.Stats do
  @moduledoc """
  Find user game statistics, using cached aggregated stats if available,
  otherwise falls back to calculating from raw game data.
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.UserGame
  alias Codebattle.UserGameStatistics.Context, as: StatsContext

  @default_game_stats %{"won" => 0, "lost" => 0, "gave_up" => 0}

  @doc """
  Returns user statistics map in shape:
  %{
    games: %{"won" => int, "lost" => int, "gave_up" => int},
    all: list of raw aggregated results by lang (only in fallback)
  }
  """
  def get_game_stats(user_id) do
    case StatsContext.get_user_stats(user_id) do
      {:ok, stats} ->
        %{
          games: %{
            "won" => stats.total_wins,
            "lost" => stats.total_losses,
            "gave_up" => Map.get(stats, :total_giveups, 0)
          },
          all: []
        }

      :error ->
        get_game_stats_fallback(user_id)
    end
  end

  defp get_game_stats_fallback(user_id) do
    user_games_stats =
      Repo.all(
        from(ug in UserGame,
          select: %{result: ug.result, lang: ug.lang, count: count(ug.id)},
          where: ug.user_id == ^user_id,
          where: ug.result in ["won", "lost", "gave_up"],
          group_by: [ug.result, ug.lang]
        )
      )

    games_stats =
      user_games_stats
      |> Enum.group_by(& &1.result, & &1.count)
      |> Map.new(fn {k, v} -> {k, Enum.sum(v)} end)
      |> Map.merge(@default_game_stats, fn _k, v1, _v2 -> v1 end)

    %{games: games_stats, all: user_games_stats}
  end
end