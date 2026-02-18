defmodule Codebattle.Repo.Migrations.AddPointsToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:points, :integer, default: 0, null: false)
    end
  end
end
