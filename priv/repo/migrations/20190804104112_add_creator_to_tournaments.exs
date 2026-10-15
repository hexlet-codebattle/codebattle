defmodule Codebattle.Repo.Migrations.AddCreatorToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:creator_id, :integer)
    end
  end
end
