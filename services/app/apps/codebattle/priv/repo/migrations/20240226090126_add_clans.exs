defmodule Codebattle.Repo.Migrations.AddClans do
  use Ecto.Migration

  def change do
    create table(:clans) do
      add :name, :string
      add :creator_id, :integer

      timestamps()
    end

    create unique_index(:clans, :name)

    alter table(:users) do
      add(:clan_id, :integer)
    end
  end
end
