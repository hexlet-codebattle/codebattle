defmodule Codebattle.Repo.Migrations.AddFieldsToTournaments2 do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:task_pack_name, :string)
      add(:show_results, :boolean, default: true, null: false)
    end
  end
end
