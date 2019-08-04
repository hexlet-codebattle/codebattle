defmodule Codebattle.Repo.Migrations.AddStepToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:step, :integer)
    end
  end
end
