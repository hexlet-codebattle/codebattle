defmodule Codebattle.Repo.Migrations.AddModeToGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:mode, :string)
    end

  end
end
