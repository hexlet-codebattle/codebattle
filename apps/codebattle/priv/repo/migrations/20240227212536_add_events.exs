defmodule Codebattle.Repo.Migrations.AddEvents do
  use Ecto.Migration

  def change do
    create table("events") do
      add(:slug, :text)
      add(:type, :text)
      add(:title, :text)
      add(:description, :text)
      add(:creator_id, :integer)
      add(:starts_at, :utc_datetime)

      timestamps()
    end

    create unique_index(:events, :slug)
  end
end
