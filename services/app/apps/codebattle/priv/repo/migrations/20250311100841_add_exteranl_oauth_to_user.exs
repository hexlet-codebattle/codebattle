defmodule Codebattle.Repo.Migrations.AddExteranlOauthToUser do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :external_oauth_id, :string
      add :category, :string
    end

    create index(:users, [:external_oauth_id], unique: true)
  end
end
