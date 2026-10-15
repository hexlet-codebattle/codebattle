defmodule Codebattle.Repo.Migrations.AddOban do
  @moduledoc false
  use Ecto.Migration

  def up do
    Oban.Migration.up(version: 12)
  end

  def down do
    Oban.Migration.down(version: 1)
  end
end
