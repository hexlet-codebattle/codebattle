defmodule Codebattle.Repo.Migrations.AddIsPrivateToGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:is_private, :boolean, default: false)
    end
  end
end
