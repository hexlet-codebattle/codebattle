defmodule Codebattle.Repo.Migrations.CreateStreamConfigs do
  use Ecto.Migration

  def change do
    create table(:stream_configs) do
      add :name, :string, null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :config, :jsonb, null: false, default: "{}"

      timestamps()
    end

    create index(:stream_configs, [:user_id])
    create unique_index(:stream_configs, [:name, :user_id], name: :stream_configs_name_user_id_index)
  end
end
