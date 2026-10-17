defmodule Codebattle.Workers.OnboardingPurgeWorker do
  @moduledoc "Deletes onboarding milestones after 90 days."
  use Oban.Worker, max_attempts: 3

  @impl Oban.Worker
  def perform(_job) do
    Codebattle.Onboarding.purge_expired()
    :ok
  end
end
