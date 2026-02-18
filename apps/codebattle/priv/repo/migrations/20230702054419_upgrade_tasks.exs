
defmodule Codebattle.Repo.Migrations.UpgradeTask do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:asserts_examples, {:array, :jsonb}, default: [])
      add(:solution, :string, default: "")
      add(:arguments_generator, :string, default: "")
    end
  end
end
