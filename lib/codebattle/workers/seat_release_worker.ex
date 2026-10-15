defmodule Codebattle.Workers.SeatReleaseWorker do
  @moduledoc """
  Releases a code-assist seat for a single tournament user. Oban retries on failure.
  """

  use Oban.Worker, max_attempts: 5, unique: [keys: [:user_id, :group_tournament_id]]

  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id, "group_tournament_id" => group_tournament_id}}) do
    UserGroupTournamentContext.release_user_seat(user_id, group_tournament_id)
  end
end
