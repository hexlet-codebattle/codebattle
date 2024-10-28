defmodule Codebattle.Repo.Migrations.FixUserLang do
  use Ecto.Migration
  import Ecto.Query
  alias Codebattle.Repo
  alias Codebattle.User

  def change do
    query = from(u in User, where: u.lang in ["css", "scss", "stylus", "less", "sass"])
    Repo.update_all(query, set: [lang: "js"])
  end
end
