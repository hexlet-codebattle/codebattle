defmodule Codebattle.Repo.Migrations.AddAvatarUrl do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:avatar_url, :string)
    end
  end
end
