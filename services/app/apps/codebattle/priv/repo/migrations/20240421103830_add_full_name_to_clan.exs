defmodule Codebattle.Repo.Migrations.AddFullNameToClan do
  use Ecto.Migration

  def change do
    alter table(:clans) do
      add(:long_name, :text)
    end
  end
end
