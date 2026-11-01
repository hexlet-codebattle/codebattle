defmodule Codebattle.Repo.Migrations.CreateMcpOauth do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:mcp_oauth_clients, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :name, :string, null: false
      add :redirect_uris, {:array, :text}, null: false
      timestamps(type: :utc_datetime)
    end

    create table(:mcp_oauth_connections, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :client_id, references(:mcp_oauth_clients, type: :uuid, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :scopes, {:array, :string}, null: false
      add :resource, :text, null: false
      add :revoked_at, :utc_datetime
      add :last_used_at, :utc_datetime
      timestamps(type: :utc_datetime)
    end

    create index(:mcp_oauth_connections, [:user_id])

    create table(:mcp_oauth_codes, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :connection_id, references(:mcp_oauth_connections, type: :uuid, on_delete: :delete_all), null: false
      add :code_hash, :binary, null: false
      add :redirect_uri, :text, null: false
      add :challenge, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :consumed_at, :utc_datetime
      timestamps(type: :utc_datetime)
    end

    create unique_index(:mcp_oauth_codes, [:code_hash])
    create index(:mcp_oauth_codes, [:connection_id])

    create table(:mcp_oauth_tokens, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :connection_id, references(:mcp_oauth_connections, type: :uuid, on_delete: :delete_all), null: false
      add :access_hash, :binary, null: false
      add :refresh_hash, :binary, null: false
      add :scopes, {:array, :string}, null: false
      add :expires_at, :utc_datetime, null: false
      add :refresh_expires_at, :utc_datetime, null: false
      add :consumed_at, :utc_datetime
      timestamps(type: :utc_datetime)
    end

    create unique_index(:mcp_oauth_tokens, [:access_hash])
    create unique_index(:mcp_oauth_tokens, [:refresh_hash])
    create index(:mcp_oauth_tokens, [:connection_id])
  end
end
