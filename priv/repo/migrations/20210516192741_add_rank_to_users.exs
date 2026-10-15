defmodule Codebattle.Repo.Migrations.AddRankToUsers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:rank, :integer)
    end
  end
end
