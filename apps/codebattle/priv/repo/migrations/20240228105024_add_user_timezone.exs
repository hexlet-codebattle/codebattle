defmodule Codebattle.Repo.Migrations.AddUserTimezone do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:timezone, :string, null: false, default: "Etc/UTC")
    end
  end
end
