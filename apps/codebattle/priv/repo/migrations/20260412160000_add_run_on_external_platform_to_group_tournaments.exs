defmodule Codebattle.Repo.Migrations.AddRunOnExternalPlatformToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:run_on_external_platform, :boolean, default: false, null: false)
    end
  end
end
