defmodule Codebattle.Repo.Migrations.AddPlaybookSolutionType do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:playbooks) do
      add(:solution_type, :string, default: "incomplete")
    end
  end
end
