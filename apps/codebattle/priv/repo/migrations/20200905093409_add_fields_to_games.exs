defmodule Codebattle.Repo.Migrations.AddFieldsToGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:tournament_id, :integer)
    end
  end
end
