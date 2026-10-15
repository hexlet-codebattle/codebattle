defmodule Codebattle.Repo.Migrations.CreateUserSessions do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:user_sessions, primary_key: false) do
      add(:id, :binary_id, primary_key: true)
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:token_hash, :binary, null: false)
      add(:user_agent, :string, size: 512)
      add(:ip, :string, size: 64)
      add(:last_seen_at, :utc_datetime, null: false)
      add(:expires_at, :utc_datetime, null: false)
      add(:revoked_at, :utc_datetime)

      timestamps()
    end

    create(unique_index(:user_sessions, [:token_hash]))
    create(index(:user_sessions, [:user_id, :revoked_at]))
    create(index(:user_sessions, [:expires_at]))
  end
end
