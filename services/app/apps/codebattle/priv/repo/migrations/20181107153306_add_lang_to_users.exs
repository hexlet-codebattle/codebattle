defmodule Codebattle.Repo.Migrations.AddLangToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :lang, :text
      add :editor_mode, :text
      add :editor_theme, :text
    end
  end
end
