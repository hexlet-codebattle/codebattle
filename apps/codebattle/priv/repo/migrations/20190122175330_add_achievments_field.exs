defmodule Codebattle.Repo.Migrations.AddAchievmentsField do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:achievements, {:array, :string})
    end
  end
end
