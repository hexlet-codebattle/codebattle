defmodule Codebattle.Repo.Migrations.BackfillAvatarUrl do
  use Ecto.Migration

  def change do
    query = "update users set avatar_url  = '/assets/images/logo.svg' where avatar_url is null"
    Ecto.Adapters.SQL.query!(Codebattle.Repo, query, [])
  end
end
