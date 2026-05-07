defmodule Codebattle.Repo.Migrations.UpdateObanToV14 do
  @moduledoc false
  use Ecto.Migration

  def up, do: Oban.Migration.up(version: 14)
  def down, do: Oban.Migration.down(version: 12)
end
