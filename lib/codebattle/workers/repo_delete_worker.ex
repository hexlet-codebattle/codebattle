defmodule Codebattle.Workers.RepoDeleteWorker do
  @moduledoc """
  Deletes a single user's tournament repository on the external platform.
  Retried by Oban on failure.
  """

  use Oban.Worker, max_attempts: 5, unique: [keys: [:user_id, :group_tournament_id]]

  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id, "group_tournament_id" => group_tournament_id}}) do
    UserGroupTournamentContext.delete_user_repo(user_id, group_tournament_id)
  end
end
