defmodule Codebattle.Repo.Migrations.AddRefToGames do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:ref, :integer)
    end
  end
end
