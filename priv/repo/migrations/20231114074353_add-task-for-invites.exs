defmodule Codebattle.Repo.Migrations.AddTaskForInvites do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:invites) do
      add(:task_id, references(:tasks))
    end
  end
end
