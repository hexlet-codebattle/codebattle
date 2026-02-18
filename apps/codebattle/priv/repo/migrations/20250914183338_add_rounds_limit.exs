defmodule Codebattle.Repo.Migrations.AddRoundsLimit do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:rounds_limit, :integer)
    end
  end
end
