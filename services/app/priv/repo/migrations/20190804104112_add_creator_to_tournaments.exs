defmodule Codebattle.Repo.Migrations.AddCreatorToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:creator_id, :integer)
    end
  end
end
