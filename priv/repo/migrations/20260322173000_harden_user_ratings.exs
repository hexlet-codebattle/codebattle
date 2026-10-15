defmodule Codebattle.Repo.Migrations.HardenUserRatings do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute("UPDATE users SET rating = 1200 WHERE rating IS NULL")

    execute("ALTER TABLE users ALTER COLUMN rating SET DEFAULT 1200")
    execute("ALTER TABLE users ALTER COLUMN rating SET NOT NULL")
  end

  def down do
    execute("ALTER TABLE users ALTER COLUMN rating DROP NOT NULL")
    execute("ALTER TABLE users ALTER COLUMN rating DROP DEFAULT")
  end
end
