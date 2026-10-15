defmodule Codebattle.Repo.Migrations.MakeGroupTournamentCreatorIdNullable do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      modify(:creator_id, references(:users, on_delete: :delete_all),
        null: true,
        from: {references(:users, on_delete: :delete_all), null: false}
      )
    end
  end
end
