defmodule Codebattle.Repo.Migrations.AddTypeToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:type, :string, null: false, default: "individual")
    end
  end
end
