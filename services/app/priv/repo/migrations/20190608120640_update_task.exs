defmodule Codebattle.Repo.Migrations.UpdateTask do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:input, :string)
      add(:output, :string)
    end
  end
end
