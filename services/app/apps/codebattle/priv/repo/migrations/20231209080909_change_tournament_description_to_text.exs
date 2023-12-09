defmodule Codebattle.Repo.Migrations.ChangeTournamentDescriptionToText do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      modify(:description, :text)
    end
  end
end
