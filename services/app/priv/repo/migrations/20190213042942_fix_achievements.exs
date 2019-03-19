defmodule Codebattle.Repo.Migrations.FixAchievements do
  use Ecto.Migration

  def change do
    alter table(:users) do
      remove :achievements
    end

  end
end
