defmodule Codebattle.Repo.Migrations.AddSolutionTemplateToLangs do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:languages) do
      add :solution_template, :text
    end
  end
end
