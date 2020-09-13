defmodule Codebattle.Repo.Migrations.AddDefaultLangToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:default_language, :string)
    end
  end
end
