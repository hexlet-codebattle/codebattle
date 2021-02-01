defmodule Codebattle.Repo.Migrations.AddDiscordIdAndDiscordNameToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:discord_id, :bigint)
      add(:discord_name, :string)
      add(:discord_avatar, :string)
    end
  end
end
