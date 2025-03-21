defmodule Codebattle.Repo.Migrations.AddCustomizations do
  use Ecto.Migration

  def change do
    create table(:customizations) do
      add(:key, :text)
      add(:value, :text)
    end

    create(unique_index(:customizations, [:key]))
  end
end
