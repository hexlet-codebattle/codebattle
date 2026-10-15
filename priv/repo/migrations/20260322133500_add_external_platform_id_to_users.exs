defmodule Codebattle.Repo.Migrations.AddExternalPlatformIdToUsers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:external_platform_id, :text)
    end
  end
end
