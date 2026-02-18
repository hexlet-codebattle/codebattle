defmodule Codebattle.Repo.Migrations.AddUseClanToTournament do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:use_clan, :boolean, null: false, default: false)
    end
  end
end
