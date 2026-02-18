defmodule Codebattle.Repo.Migrations.AddGithubNameToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :github_name, :string
    end
  end
end
