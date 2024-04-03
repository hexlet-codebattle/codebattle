defmodule Codebattle.Repo.Migrations.AddCollabLogToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:collab_logo, :text)
    end
  end
end
