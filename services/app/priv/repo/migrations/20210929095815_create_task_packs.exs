defmodule Codebattle.Repo.Migrations.CreateTaskPacks do
  use Ecto.Migration

  def change do
    create table(:task_packs) do
      add :name, :string
      add :state, :string
      add :visibility, :string
      add :task_ids, {:array, :integer}
      add :creator_id, :integer

      timestamps()
    end

    create unique_index(:task_packs, :name)
  end
end
