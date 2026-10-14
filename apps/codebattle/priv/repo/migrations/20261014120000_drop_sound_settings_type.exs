defmodule Codebattle.Repo.Migrations.DropSoundSettingsType do
  @moduledoc false
  use Ecto.Migration

  # Sound themes (dendy/cs/standard) are gone: games always use the one sound set.
  def up do
    execute("UPDATE users SET sound_settings = sound_settings - 'type' WHERE sound_settings ? 'type'")
  end

  def down do
    execute("""
    UPDATE users
    SET sound_settings = jsonb_set(sound_settings, '{type}', '"dendy"'::jsonb, true)
    WHERE sound_settings IS NOT NULL
    """)
  end
end
