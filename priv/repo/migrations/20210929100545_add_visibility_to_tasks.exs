defmodule Codebattle.Repo.Migrations.AddVisibilityToTasks do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:state, :string)
      add(:visibility, :string)
      add(:origin, :string)
      add(:creator_id, :integer)
    end
  end
end
