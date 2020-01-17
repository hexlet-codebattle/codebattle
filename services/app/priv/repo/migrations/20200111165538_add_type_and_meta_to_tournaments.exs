defmodule Codebattle.Repo.Migrations.AddTypeAndMetaToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:type, :string, null: false, default: "individual")
      add(:meta, :jsonb, null: false, default: "{}")
    end
  end
end
