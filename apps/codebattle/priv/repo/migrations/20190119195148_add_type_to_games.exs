defmodule Codebattle.Repo.Migrations.AddTypeGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:type, :string)
    end
  end

  def down do
    alter table(:games) do
      remove(:type)
    end
  end
end
