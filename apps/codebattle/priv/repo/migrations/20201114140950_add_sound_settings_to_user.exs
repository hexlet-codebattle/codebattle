defmodule Codebattle.Repo.Migrations.AddSoundSettingsToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:sound_settings, :jsonb, default: "{}", null: false)
    end
  end
end
