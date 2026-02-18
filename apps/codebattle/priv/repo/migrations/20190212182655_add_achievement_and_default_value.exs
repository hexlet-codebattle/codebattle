defmodule Codebattle.Repo.Migrations.AddAchievementAndDefaultValue do
  use Ecto.Migration

  def change do
    alter table(:users) do
      modify(:achievements, {:array, :string}, default: [])
    end
  end
end
