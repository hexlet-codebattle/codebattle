defmodule Codebattle.Repo.Migrations.AddRaitingToUsers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :raiting, :integer, default: 1200
    end
  end
end
