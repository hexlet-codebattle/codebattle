defmodule Codebattle.Repo.Migrations.ModifyTaskTexts do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      modify(:solution, :text)
      modify(:arguments_generator, :text)
      modify(:examples, :text)
    end
  end
end
