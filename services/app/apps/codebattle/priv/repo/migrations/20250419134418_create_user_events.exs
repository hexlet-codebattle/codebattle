defmodule Codebattle.Repo.Migrations.CreateUserEvents do
  use Ecto.Migration

  def change do
    drop table(:user_events)
    create table(:user_events) do
      add(:user_id, references(:users, on_delete: :delete_all))
      add(:event_id, references(:events, on_delete: :delete_all))
      add(:state, :map)
      add(:stages, :map)

      timestamps()
    end

    create unique_index(:user_events, [:user_id, :event_id])

    alter table(:events) do
      add(:stages, :map)
    end
  end
end
