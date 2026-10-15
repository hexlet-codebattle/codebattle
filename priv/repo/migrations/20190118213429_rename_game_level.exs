defmodule Codebattle.Repo.Migrations.RenameGameLevel do
  @moduledoc false
  use Ecto.Migration

  def change do
    rename table(:games), :task_level, to: :level
  end
end
