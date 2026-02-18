defmodule Codebattle.Repo.Migrations.AddUseEventScoreForTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:use_event_ranking, :boolean, null: false, default: false)
    end
  end
end
