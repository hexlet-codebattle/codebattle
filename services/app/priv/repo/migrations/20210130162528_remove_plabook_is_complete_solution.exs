defmodule Codebattle.Repo.Migrations.RemovePlabookIsCompleteSolution do
  use Ecto.Migration
  import Ecto.Query
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo

  def change do
    query = from(p in Playbook, where: p.is_complete_solution)

    Repo.update_all(query, [set: [solution_type: "complete"]])

    alter table(:playbooks) do
      remove(:is_complete_solution)
    end
  end
end
