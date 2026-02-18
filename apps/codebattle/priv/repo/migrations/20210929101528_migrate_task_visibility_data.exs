defmodule Codebattle.Repo.Migrations.MigrateTaskVisibilityData do
  use Ecto.Migration

  def up do
    execute(fn -> repo().update_all("tasks", set: [origin: "github"]) end)
    execute(fn -> repo().update_all("tasks", set: [visibility: "public"]) end)
    execute("Update tasks set visibility = 'public'")

    execute("Update tasks set state = 'active' where disabled='f'")
    execute("Update tasks set state = 'disabled' where disabled='t'")
  end

  def down do
    nil
  end
end
