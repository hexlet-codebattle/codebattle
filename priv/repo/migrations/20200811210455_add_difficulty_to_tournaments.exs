defmodule Codebattle.Repo.Migrations.AddDifficultyToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:difficulty, :string, null: false, default: "elementary")
    end
  end
end
