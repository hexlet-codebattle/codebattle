defmodule Codebattle.Workers.GroupTournamentOccupyWorker do
  @moduledoc """
  Bulk-occupies code-assist workplaces for a chunk of users (up to 50) when a
  group tournament transitions to "active". Idempotent and safe to retry.
  """

  use Oban.Worker, max_attempts: 5, unique: [keys: [:group_tournament_id, :chunk]]

  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"group_tournament_id" => group_tournament_id, "user_ids" => user_ids}}) do
    UserGroupTournamentContext.occupy_chunk(group_tournament_id, user_ids)
  end
end
