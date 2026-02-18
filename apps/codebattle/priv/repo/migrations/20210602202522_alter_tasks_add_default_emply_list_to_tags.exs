defmodule Codebattle.Repo.Migrations.AlterTasksAddDefaultEmplyListToTags do
  use Ecto.Migration
  import Ecto.Query
  alias Codebattle.Repo
  alias Codebattle.Task

  def change do
    query = from(t in Task, where: is_nil(t.tags))
    Repo.update_all(query, set: [tags: []])

    alter table(:tasks) do
      modify(:tags, {:array, :string}, default: [])
    end
  end
end
