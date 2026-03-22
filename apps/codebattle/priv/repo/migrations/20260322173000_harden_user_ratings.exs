defmodule Codebattle.Repo.Migrations.HardenUserRatings do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute("UPDATE users SET rating = 1200 WHERE rating IS NULL")

    execute("ALTER TABLE users ALTER COLUMN rating SET DEFAULT 1200")
    execute("ALTER TABLE users ALTER COLUMN rating SET NOT NULL")

    create(constraint(:users, :users_rating_non_negative, check: "rating >= 0"))
  end

  def down do
    drop(constraint(:users, :users_rating_non_negative))

    execute("ALTER TABLE users ALTER COLUMN rating DROP NOT NULL")
    execute("ALTER TABLE users ALTER COLUMN rating DROP DEFAULT")
  end
end
