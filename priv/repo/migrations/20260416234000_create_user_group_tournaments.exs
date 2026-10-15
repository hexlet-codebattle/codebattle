defmodule Codebattle.Repo.Migrations.CreateUserGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:user_group_tournaments) do
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all), null: false)

      add(:state, :string, null: false, default: "pending")
      add(:repo_state, :string, null: false, default: "pending")
      add(:role_state, :string, null: false, default: "pending")
      add(:secret_state, :string, null: false, default: "pending")

      add(:token, :text)
      add(:repo_url, :text)
      add(:role, :string)
      add(:secret_key, :string)
      add(:secret_group, :string)

      add(:repo_response, :map, null: false, default: %{})
      add(:role_response, :map, null: false, default: %{})
      add(:secret_response, :map, null: false, default: %{})
      add(:last_error, :map, null: false, default: %{})

      timestamps()
    end

    create(unique_index(:user_group_tournaments, [:user_id, :group_tournament_id]))
    create(unique_index(:user_group_tournaments, [:token]))
    create(index(:user_group_tournaments, [:group_tournament_id]))
  end
end
