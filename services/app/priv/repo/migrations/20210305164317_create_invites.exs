defmodule Codebattle.Repo.Migrations.CreateInvites do
  use Ecto.Migration

  def change do
    create table(:invites) do
      add :state, :string
      add :game_params, :jsonb
      add :creator_id, references(:users, on_delete: :nothing)
      add :recepient_id, references(:users, on_delete: :nothing)
      add :game_id, references(:games)

      timestamps()
    end

    create index(:invites, [:creator_id])
    create index(:invites, [:recepient_id])
  end
end
