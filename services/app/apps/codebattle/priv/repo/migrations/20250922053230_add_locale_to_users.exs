defmodule Codebattle.Repo.Migrations.AddLocaleToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:locale, :text, null: false, default: "en")
    end
  end
end
