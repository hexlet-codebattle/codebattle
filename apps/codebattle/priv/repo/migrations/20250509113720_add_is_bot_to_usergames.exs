defmodule Codebattle.Repo.Migrations.AddIsBotToUsergames do
  use Ecto.Migration

  def change do
    alter table(:user_games) do
      add(:is_bot, :boolean, default: false)
    end
  end
end
