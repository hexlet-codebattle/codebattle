defmodule Codebattle.Repo.Migrations.ChangeTournamentResultIndex do
  use Ecto.Migration

  def change do

    # TODO: rething this index
    drop index(:tournament_results, [:tournament_id, :user_id, :task_id])
  end
end
