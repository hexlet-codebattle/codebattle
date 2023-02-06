defmodule Codebattle.Repo.Migrations.AddFirebaseUid do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:firebase_uid, :string)
    end
  end
end
