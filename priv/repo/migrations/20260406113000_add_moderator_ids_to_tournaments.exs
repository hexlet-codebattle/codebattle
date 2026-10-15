defmodule Codebattle.Repo.Migrations.AddModeratorIdsToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:moderator_ids, {:array, :integer}, default: [], null: false)
    end
  end
end
