defmodule Codebattle.Repo.Migrations.AddAccessTypesToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:access_type, :string)
      add(:access_token, :string)
    end
  end
end
