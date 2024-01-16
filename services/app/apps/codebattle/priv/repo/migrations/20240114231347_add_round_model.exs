defmodule Codebattle.Repo.Migrations.AddRoundModel do
  use Ecto.Migration

  def change do
    create table(:rounds) do
      add :name, :string
      add :state, :string
      add :level, :string
      add :task_provider, :string
      add :task_strategy, :string
      add :round_timeout_seconds, :integer
      add :break_duration_seconds, :integer
      add :use_infinite_break, :boolean, default: false
      add :tournament_type, :string
      add :player_ids, {:array, :integer}, default: []
      add :task_pack_id, :integer

      add :tournament_id, references(:tournaments)

      timestamps()
    end

    rename(table(:tournaments), :current_round, to: :current_round_position)

    alter table(:tournaments) do
      add(:current_round_id, references(:rounds))
    end

    alter table(:games) do
      add(:round_id, references(:rounds))
    end
  end
end
