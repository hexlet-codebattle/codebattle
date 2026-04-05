defmodule Codebattle.Repo.Migrations.CreateGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:group_tournaments) do
      add(:creator_id, references(:users, on_delete: :delete_all), null: false)
      add(:group_task_id, references(:group_tasks, on_delete: :restrict), null: false)
      add(:name, :string, null: false)
      add(:slug, :string, null: false)
      add(:description, :text, null: false)
      add(:state, :string, null: false, default: "waiting_participants")
      add(:starts_at, :utc_datetime, null: false)
      add(:started_at, :utc_datetime)
      add(:finished_at, :utc_datetime)
      add(:current_round_position, :integer, null: false, default: 0)
      add(:rounds_count, :integer, null: false, default: 1)
      add(:round_timeout_seconds, :integer, null: false)
      add(:last_round_started_at, :naive_datetime)
      add(:last_round_ended_at, :naive_datetime)
      add(:meta, :map, null: false, default: %{})

      timestamps()
    end

    create(unique_index(:group_tournaments, [:slug]))
    create(index(:group_tournaments, [:creator_id]))
    create(index(:group_tournaments, [:group_task_id]))
    create(index(:group_tournaments, [:state]))

    create table(:group_tournament_players) do
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all), null: false)
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:lang, :string, null: false)
      add(:state, :string, null: false, default: "active")
      add(:last_setup_at, :utc_datetime)

      timestamps()
    end

    create(unique_index(:group_tournament_players, [:group_tournament_id, :user_id]))
    create(index(:group_tournament_players, [:group_tournament_id]))
    create(index(:group_tournament_players, [:user_id]))

    alter table(:group_task_runs) do
      add(:group_tournament_id, references(:group_tournaments, on_delete: :nilify_all))
    end

    create(index(:group_task_runs, [:group_tournament_id]))

    create table(:group_tournament_tokens) do
      add(:user_id, references(:users), null: false)
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all), null: false)
      add(:token, :string, null: false)

      timestamps()
    end

    create(unique_index(:group_tournament_tokens, [:token]))
    create(unique_index(:group_tournament_tokens, [:user_id, :group_tournament_id]))
    create(index(:group_tournament_tokens, [:group_tournament_id]))
  end
end
