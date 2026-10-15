defmodule Codebattle.Repo.Migrations.AddDurationSecToGames do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:duration_sec, :integer)
    end
  end
end
