defmodule Codebattle.Repo.Migrations.AddUserClan do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:clan, :string, default: "")
    end
  end
end
