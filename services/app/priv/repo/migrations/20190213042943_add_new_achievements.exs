defmodule Codebattle.Repo.Migrations.AddNewAchievements do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:achievements, {:array, :string}, null: false, default: [])
    end

  end
end
