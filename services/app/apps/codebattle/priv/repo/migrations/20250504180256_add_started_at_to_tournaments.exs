defmodule Codebattle.Repo.Migrations.AddStartedAtToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:started_at, :utc_datetime)
    end
  end
end
