defmodule Codebattle.Repo.Migrations.AddRequireInvitationToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:require_invitation, :boolean, default: false, null: false)
    end
  end
end
