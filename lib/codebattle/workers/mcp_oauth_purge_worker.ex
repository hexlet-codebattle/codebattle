defmodule Codebattle.Workers.McpOauthPurgeWorker do
  @moduledoc "Deletes expired MCP OAuth token families daily."
  use Oban.Worker, max_attempts: 3

  @impl Oban.Worker
  def perform(_job) do
    Codebattle.Mcp.Oauth.purge_expired()
    :ok
  end
end
