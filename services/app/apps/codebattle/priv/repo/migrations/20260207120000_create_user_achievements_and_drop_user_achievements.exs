defmodule Codebattle.Repo.Migrations.CreateUserAchievementsAndDropUserAchievements do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:user_achievements) do
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:type, :string, null: false)
      add(:meta, :map, null: false, default: %{})

      timestamps()
    end

    create(unique_index(:user_achievements, [:user_id, :type]))

    alter table(:users) do
      remove(:achievements)
    end
  end
end
