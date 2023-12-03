defmodule Codebattle.Repo.Migrations.AddUseChatForGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:use_chat, :boolean, null: false, default: true)
    end
  end
end
