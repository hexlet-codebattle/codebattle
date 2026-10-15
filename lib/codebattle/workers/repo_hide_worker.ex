defmodule Codebattle.Workers.RepoHideWorker do
  @moduledoc """
  Hides a chunk of tournament repositories in one bulk call.
  Retried by Oban on failure. Idempotent at the platform layer.
  """

  use Oban.Worker, max_attempts: 5

  alias Codebattle.ExternalPlatform

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"repo_ids" => repo_ids}}) when is_list(repo_ids) and repo_ids != [] do
    case ExternalPlatform.hide_repos(repo_ids) do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  def perform(_), do: :ok
end
