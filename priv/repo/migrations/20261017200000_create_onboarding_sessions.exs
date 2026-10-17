defmodule Codebattle.Repo.Migrations.CreateOnboardingSessions do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:onboarding_sessions) do
      add :guest_id, :bigint, null: false
      add :landed_at, :utc_datetime_usec, null: false
      add :setup_at, :utc_datetime_usec
      add :practice_started_at, :utc_datetime_usec
      add :first_check_at, :utc_datetime_usec
      add :solved_at, :utc_datetime_usec
      add :next_practice_at, :utc_datetime_usec
      add :signed_in_at, :utc_datetime_usec
      add :first_game_id, references(:games, on_delete: :nilify_all)
      add :first_lang, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:onboarding_sessions, [:guest_id])
    create unique_index(:onboarding_sessions, [:first_game_id])
    create index(:onboarding_sessions, [:landed_at])
  end
end
