defmodule Codebattle.Repo.Migrations.CreateExternalPlatformInvites do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:external_platform_invites) do
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all))
      add(:state, :string, null: false, default: "pending")
      add(:operation_id, :string)
      add(:status_url, :string)
      add(:invite_link, :string)
      add(:expires_at, :utc_datetime)
      add(:response, :map, default: %{})

      timestamps()
    end

    create(index(:external_platform_invites, [:user_id]))
    create(index(:external_platform_invites, [:group_tournament_id]))
    create(unique_index(:external_platform_invites, [:user_id, :group_tournament_id]))
  end
end
