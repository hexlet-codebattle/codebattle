defmodule Codebattle.Repo.Migrations.AddAnonymousFlag do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:is_anonymous, :boolean, default: false)
    end
    alter table(:user_games) do
      add(:is_anonymous, :boolean, default: false)
    end
  end
end
