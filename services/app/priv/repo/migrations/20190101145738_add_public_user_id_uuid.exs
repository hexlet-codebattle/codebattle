defmodule Codebattle.Repo.Migrations.AddPublicUserIdUuid do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:public_id, :uuid, default: fragment("uuid_generate_v4()"))
    end
  end
end
