defmodule Codebattle.Repo.Migrations.AddOauthConnectionToApiAudit do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:api_audit_events) do
      add :oauth_connection_id, references(:mcp_oauth_connections, type: :uuid, on_delete: :nilify_all)
    end

    create index(:api_audit_events, [:oauth_connection_id])
  end
end
