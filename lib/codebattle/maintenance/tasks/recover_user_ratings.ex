defmodule Codebattle.Maintenance.Tasks.RecoverUserRatings do
  @moduledoc """
  Rebuilds suspiciously low user ratings from persisted `user_games` history.

  The task recalculates ratings from the first suspicious collapse onward:
  - it only considers users whose current rating is below a configurable threshold
  - it finds the first transition from a sane rating to a suspiciously low rating
  - it uses the last sane rating as the baseline
  - it replays `rating_diff` values from the corrupted row onward
  - it does nothing unless `recover/1` is called explicitly
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGame

  @default_threshold 100
  @type recovery_plan_item :: %{
          user_id: pos_integer(),
          current_rating: integer(),
          recovered_rating: integer(),
          baseline_rating: integer(),
          source_game_id: pos_integer(),
          source_inserted_at: NaiveDateTime.t(),
          games_count: non_neg_integer(),
          total_rating_diff: integer()
        }

  @spec plan(keyword()) :: [recovery_plan_item()]
  def plan(opts \\ []) do
    threshold = Keyword.get(opts, :threshold, @default_threshold)
    user_ids = Keyword.get(opts, :user_ids)

    threshold
    |> suspicious_users_query(user_ids)
    |> Repo.all()
    |> Enum.map(&build_recovery_plan(&1, threshold))
    |> Enum.reject(&is_nil/1)
  end

  @spec recover(keyword()) :: [recovery_plan_item()]
  def recover(opts \\ []) do
    plans = plan(opts)

    Repo.transaction(fn ->
      Enum.each(plans, fn %{user_id: user_id, recovered_rating: recovered_rating} ->
        user_id
        |> User.get!()
        |> User.rating_changeset(%{rating: recovered_rating})
        |> Repo.update!()
      end)
    end)

    plans
  end

  @spec build_recovery_plan(User.t(), integer()) :: recovery_plan_item() | nil
  def build_recovery_plan(%User{id: user_id, rating: current_rating}, threshold) do
    history = rating_history(user_id)

    with %{baseline_rating: baseline_rating, history_from_drop: history_from_drop} = drop <-
           find_suspicious_drop(history, threshold) do
      total_rating_diff = Enum.sum_by(history_from_drop, & &1.rating_diff)
      recovered_rating = baseline_rating + total_rating_diff

      if recovered_rating != current_rating do
        %{
          user_id: user_id,
          current_rating: current_rating,
          recovered_rating: recovered_rating,
          baseline_rating: baseline_rating,
          source_game_id: drop.source_game_id,
          source_inserted_at: drop.source_inserted_at,
          games_count: length(history_from_drop),
          total_rating_diff: total_rating_diff
        }
      end
    end
  end

  defp suspicious_users_query(threshold, nil) do
    from(u in User,
      where: u.is_bot == false and not is_nil(u.rating) and u.rating < ^threshold
    )
  end

  defp suspicious_users_query(threshold, user_ids) do
    from(u in User,
      where: u.is_bot == false and not is_nil(u.rating) and u.rating < ^threshold and u.id in ^user_ids
    )
  end

  defp rating_history(user_id) do
    Repo.all(
      from(ug in UserGame,
        where: ug.user_id == ^user_id,
        order_by: [asc: ug.inserted_at, asc: ug.id],
        select: %{
          game_id: ug.game_id,
          inserted_at: ug.inserted_at,
          rating: ug.rating,
          rating_diff: type(coalesce(ug.rating_diff, 0), :integer)
        }
      )
    )
  end

  defp find_suspicious_drop(history, threshold) do
    case history
         |> Enum.with_index()
         |> Enum.reduce_while(nil, fn {row, idx}, previous_row ->
           reduce_suspicious_drop(history, threshold, row, idx, previous_row)
         end) do
      %{baseline_rating: _} = drop -> drop
      _ -> nil
    end
  end

  defp reduce_suspicious_drop(history, threshold, row, idx, %{rating: previous_rating})
       when previous_rating >= threshold and row.rating < threshold and previous_rating > row.rating do
    {:halt,
     %{
       baseline_rating: previous_rating,
       source_game_id: row.game_id,
       source_inserted_at: row.inserted_at,
       history_from_drop: Enum.drop(history, idx)
     }}
  end

  defp reduce_suspicious_drop(_history, _threshold, row, _idx, _previous_row), do: {:cont, row}
end
