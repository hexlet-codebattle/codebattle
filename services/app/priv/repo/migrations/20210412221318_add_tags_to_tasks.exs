defmodule Codebattle.Repo.Migrations.AddTagsToTasks do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add :tags, {:array, :string}
    end
  end
end
