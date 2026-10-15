defmodule Codebattle.Workers.ViewerRoleAddWorker do
  @moduledoc """
  Grants the viewer repo role to a single tournament user. Oban retries on failure.
  """

  use Oban.Worker, max_attempts: 5, unique: [keys: [:user_id, :group_tournament_id]]

  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id, "group_tournament_id" => group_tournament_id}}) do
    UserGroupTournamentContext.add_user_viewer_role(user_id, group_tournament_id)
  end
end
