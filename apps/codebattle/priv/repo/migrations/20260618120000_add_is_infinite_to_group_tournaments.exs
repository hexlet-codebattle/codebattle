defmodule Codebattle.Repo.Migrations.AddIsInfiniteToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:is_infinite, :boolean, default: false, null: false)
    end
  end
end
