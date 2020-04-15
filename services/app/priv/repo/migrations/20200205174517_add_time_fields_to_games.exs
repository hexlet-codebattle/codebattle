defmodule Codebattle.Repo.Migrations.AddTimeFieldsToGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      remove(:duration_in_seconds)
      add(:starts_at, :naive_datetime)
      add(:finishs_at, :naive_datetime)
    end
  end
end
