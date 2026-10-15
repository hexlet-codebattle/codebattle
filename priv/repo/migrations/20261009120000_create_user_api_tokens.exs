defmodule Codebattle.Repo.Migrations.CreateUserApiTokens do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:user_api_tokens, primary_key: false) do
      add(:id, :binary_id, primary_key: true)
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:name, :string, null: false)
      add(:token_hash, :binary, null: false)
      add(:token_prefix, :string, null: false)
      add(:scopes, {:array, :string}, null: false, default: ["read"])
      add(:last_used_at, :utc_datetime)
      add(:expires_at, :utc_datetime)
      add(:revoked_at, :utc_datetime)

      timestamps()
    end

    create(unique_index(:user_api_tokens, [:token_hash]))
    create(index(:user_api_tokens, [:user_id]))

    create table(:api_audit_events) do
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:api_token_id, references(:user_api_tokens, type: :binary_id, on_delete: :nilify_all))
      add(:action, :string, null: false)
      add(:resource_type, :string, null: false)
      add(:resource_id, :bigint)

      timestamps(updated_at: false)
    end

    create(index(:api_audit_events, [:user_id, :action, :inserted_at]))
  end
end
