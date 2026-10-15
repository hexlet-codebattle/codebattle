defmodule Codebattle.Repo.Migrations.AddDisabledToTasks do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:disabled, :boolean, default: false)
    end
  end
end
