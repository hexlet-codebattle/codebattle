defmodule Codebattle.Workers.UserSessionPurgeWorker do
  @moduledoc """
  Daily cron: deletes stale browser sessions so their IP and user agent aren't
  kept longer than the retention period stated on /privacy.
  """

  use Oban.Worker, max_attempts: 3

  alias Codebattle.UserSession

  @impl Oban.Worker
  def perform(_job) do
    UserSession.purge_stale()
    :ok
  end
end
