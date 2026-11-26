defmodule Codebattle.Repo.Migrations.DropExternalPlatformInvites do
  @moduledoc false

  use Ecto.Migration

  def up do
    execute("""
    DELETE FROM oban_jobs
    WHERE worker = 'Codebattle.Workers.PlatformInviteAdvancerWorker'
    """)

    drop(table(:external_platform_invites))
  end

  def down do
    raise Ecto.MigrationError, message: "Dropped external platform invites cannot be restored"
  end
end
