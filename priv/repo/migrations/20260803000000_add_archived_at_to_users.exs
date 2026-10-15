defmodule Codebattle.Repo.Migrations.AddArchivedAtToUsers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:archived_at, :utc_datetime)
    end

    create(index(:users, [:archived_at]))
  end
end
