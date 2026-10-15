defmodule Codebattle.Repo.Migrations.AddFirebaseUid do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:firebase_uid, :string)
    end
  end
end
