defmodule Codebattle.Repo.Migrations.AddWorkplaceAndFinalizeStatesToUserGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_group_tournaments) do
      add(:workplace_state, :string, default: "pending", null: false)
      add(:release_state, :string, default: "pending", null: false)
      add(:viewer_role_state, :string, default: "pending", null: false)
      add(:dev_role_removal_state, :string, default: "pending", null: false)

      add(:workplace_response, :map, default: %{})
      add(:release_response, :map, default: %{})
      add(:viewer_role_response, :map, default: %{})
      add(:dev_role_removal_response, :map, default: %{})
    end
  end
end
