defmodule Codebattle.Repo.Migrations.AddTaskDescriptionToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:task_description, :text)
    end
  end
end
