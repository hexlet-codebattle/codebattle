defmodule Codebattle.Repo.Migrations.DropByClanRankingType do
  @moduledoc false
  use Ecto.Migration

  # by_clan ranking is gone: tournaments that still have it rank by user.
  def up do
    execute("UPDATE tournaments SET ranking_type = 'by_user' WHERE ranking_type = 'by_clan'")
  end

  def down, do: :ok
end
