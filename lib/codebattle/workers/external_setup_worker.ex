defmodule Codebattle.Workers.ExternalSetupWorker do
  @moduledoc """
  Provisions external platform resources (repo, role, secret) for a user
  after their invite is accepted. Each provisioning step is idempotent —
  already-completed steps are skipped.
  """

  use Oban.Worker, max_attempts: 5, unique: [keys: [:user_id, :group_tournament_id]]

  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id, "group_tournament_id" => group_tournament_id}}) do
    user = Repo.get!(User, user_id)
    group_tournament = GroupTournamentContext.get_group_tournament!(group_tournament_id)

    with {:ok, synced_user} <- UserGroupTournamentContext.ensure_platform_identity(user) do
      case UserGroupTournamentContext.ensure_external_setup(synced_user, group_tournament) do
        {:ok, _record} -> :ok
        {:error, reason, _record} -> {:error, reason}
      end
    end
  end
end
