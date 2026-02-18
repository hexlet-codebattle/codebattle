defmodule Codebattle.Repo.Migrations.AddUserSubscription do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:subscription_type, :string, default: "free", null: false)
    end
  end
end
