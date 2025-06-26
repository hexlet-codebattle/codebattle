defmodule Codebattle.UserGameStatistics.Context do
  import Ecto.Query, warn: false
  alias Codebattle.Repo
  alias Codebattle.UserGame
  alias Codebattle.UserGameStatistics

  @doc """
  Returns {:ok, stats_struct} if found, otherwise :error
  """
  def get_user_stats(user_id) do
    case Repo.get_by(UserGameStatistics, user_id: user_id) do
      nil -> :error
      stat -> {:ok, stat}
    end
  end

  @doc """
  Calculates fresh stats from raw user_games data and inserts or updates
  the aggregated statistics record.
  """
  def update_user_stats(user_id) do
    query =
      from ug in UserGame,
        where: ug.user_id == ^user_id,
        select: %{
          result: ug.result,
          is_bot: ug.is_bot
        }

    user_games = Repo.all(query)
    stats = calculate_stats(user_games)

    case Repo.get_by(UserGameStatistics, user_id: user_id) do
      nil ->
        %UserGameStatistics{}
        |> UserGameStatistics.changeset(Map.put(stats, :user_id, user_id))
        |> Repo.insert()

      stat_record ->
        stat_record
        |> UserGameStatistics.changeset(stats)
        |> Repo.update()
    end
  end

  defp calculate_stats(user_games) do
    total_games = length(user_games)
    total_wins = Enum.count(user_games, &(&1.result == "won"))
    total_losses = Enum.count(user_games, &(&1.result == "lost"))
    total_giveups = Enum.count(user_games, &(&1.result == "gave_up"))
    versus_bot_games = Enum.count(user_games, &(&1.is_bot == true))
    versus_human_games = Enum.count(user_games, &(&1.is_bot == false))

    %{
      total_games: total_games,
      total_wins: total_wins,
      total_losses: total_losses,
      total_giveups: total_giveups,
      versus_bot_games: versus_bot_games,
      versus_human_games: versus_human_games
    }
  end
end