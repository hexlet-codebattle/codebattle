defmodule Codebattle.Repo.Migrations.AddExamplesListToTasks do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:examples_list, {:array, :string}, default: [], null: false)
    end
  end
end
