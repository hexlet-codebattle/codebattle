defmodule Codebattle.Repo.Migrations.DropGroupTournamentsSlugUniqueIndex do
  @moduledoc false
  use Ecto.Migration

  def change do
    drop_if_exists(index(:group_tournaments, [:slug], unique: true))
  end
end
