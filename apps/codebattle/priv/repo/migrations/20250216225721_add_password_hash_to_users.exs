defmodule Codebattle.Repo.Migrations.AddPasswordHashToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:password_hash, :text)
    end
  end
end
