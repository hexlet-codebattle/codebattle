defmodule Codebattle.Repo.Migrations.CreateTasks do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:tasks) do
      add :description, :string

      timestamps()
    end
  end
end
