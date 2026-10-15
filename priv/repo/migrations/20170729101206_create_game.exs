defmodule Codebattle.Repo.Migrations.CreateGame do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:games) do
      add(:state, :string)

      timestamps()
    end
  end
end
