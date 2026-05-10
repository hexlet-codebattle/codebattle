defmodule Codebattle.Workers.GroupTournamentFinalizeWorker do
  @moduledoc """
  Finalizes a chunk of users (up to 50) for a group tournament after it ends:
  bulk-releases their code-assist workplaces, bulk-removes the developer role
  inherited from the org, and grants each user the `viewer` role on their repo.
  Each sub-step is idempotent and the worker is safe to retry.
  """

  use Oban.Worker, max_attempts: 5, unique: [keys: [:group_tournament_id, :chunk]]

  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"group_tournament_id" => group_tournament_id, "user_ids" => user_ids}}) do
    UserGroupTournamentContext.finalize_chunk(group_tournament_id, user_ids)
  end
end
