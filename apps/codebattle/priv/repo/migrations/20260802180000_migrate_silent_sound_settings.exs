defmodule Codebattle.Repo.Migrations.MigrateSilentSoundSettings do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute("""
    UPDATE users
    SET sound_settings =
      jsonb_set(
        jsonb_set(sound_settings, '{type}', '"dendy"'::jsonb, true),
        '{muted}',
        'true'::jsonb,
        true
      )
    WHERE sound_settings->>'type' = 'silent'
    """)
  end

  def down do
    execute("""
    UPDATE users
    SET sound_settings =
      jsonb_set(sound_settings - 'muted', '{type}', '"silent"'::jsonb, true)
    WHERE sound_settings->>'muted' = 'true'
    """)
  end
end
