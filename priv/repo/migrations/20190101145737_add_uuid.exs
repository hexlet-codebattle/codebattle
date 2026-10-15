defmodule Codebattle.Repo.Migrations.AddUuid do
  @moduledoc false
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
  end
end
