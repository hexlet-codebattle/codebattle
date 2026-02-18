defmodule Codebattle.Repo.Migrations.CreateUser do
  use Ecto.Migration

  def change do
    create table(:users) do
      add :name, :string
      add :email, :string
      add :github_id, :integer

      timestamps()
    end

  end
end
