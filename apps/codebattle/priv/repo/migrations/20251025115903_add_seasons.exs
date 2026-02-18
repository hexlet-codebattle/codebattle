defmodule Codebattle.Repo.Migrations.AddSeasons do
  use Ecto.Migration

  def change do
    create table(:seasons) do
      add(:starts_at, :date)
      add(:ends_at, :date)
      add(:name, :string)
      add(:year, :integer)
    end
  end
end
