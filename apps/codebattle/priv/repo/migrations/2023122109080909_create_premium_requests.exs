defmodule Codebattle.Repo.Migrations.CreatePremiumRequests do
  use Ecto.Migration

  def change do
    create table(:premium_requests) do
      add :status, :string
      add :user_id, references(:users)

      timestamps()
    end
  end

end
