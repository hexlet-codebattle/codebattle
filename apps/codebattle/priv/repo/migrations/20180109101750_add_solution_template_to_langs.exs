defmodule Codebattle.Repo.Migrations.AddSolutionTemplateToLangs do
  use Ecto.Migration

  def change do
    alter table(:languages) do
      add :solution_template, :text
    end
  end
end
