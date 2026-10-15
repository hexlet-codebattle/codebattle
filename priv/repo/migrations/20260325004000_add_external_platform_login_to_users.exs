defmodule Codebattle.Repo.Migrations.AddExternalPlatformLoginToUsers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:external_platform_login, :string)
    end
  end
end
