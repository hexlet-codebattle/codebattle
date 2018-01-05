defmodule Codebattle.Repo.Migrations.CreateLanguage do
  use Ecto.Migration

  def change do
    create table(:languages) do
      add :name, :string
      add :slug, :string
      add :version, :string
      add :extension, :string
      add :docker_image, :string

      timestamps()
    end

    create unique_index(:languages, [:slug])
  end
end
