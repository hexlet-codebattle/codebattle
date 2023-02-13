defmodule Codebattle.Repo.Migrations.CreateTournaments do
  use Ecto.Migration

  def change do
    create table(:tournaments) do
      add(:name, :string)
      add(:state, :string)
      add(:result, :string)
      add(:players_count, :integer)
      add(:data, :jsonb, default: "{}")
      add(:starts_at, :naive_datetime)

      timestamps()
    end
  end
end
