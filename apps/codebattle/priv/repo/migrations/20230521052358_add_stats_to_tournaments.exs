defmodule Codebattle.Repo.Migrations.AddStatsToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:stats, :jsonb)
      add(:winner_ids, {:array, :integer})
      add(:finished_at, :utc_datetime)
      add(:labels, {:array, :string})
    end
  end
end
