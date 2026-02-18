defmodule Codebattle.Repo.Migrations.AddExperimentTasks do use Ecto.Migration

  def change do
    create table(:css_tasks) do
      add :description_ru, :string
      add :description_en, :string
      add :type, :string, default: "css"
      add :name, :string
      add :level, :string
      add :img_data_url, :string
      add :disabled, :boolean
      add :count, :integer, virtual: true
      add :tags, {:array, :string}, default: []
      add :state, :string
      add :visibility, :string, default: "public"
      add :origin, :string
      add :creator_id, :integer
      add :html, :string, default: ""
      add :styles, :string, default: ""

      timestamps()
    end

    create table(:sql_tasks) do
      add :description_ru, :string
      add :description_en, :string
      add :type, :string, default: "sql"
      add :name, :string
      add :level, :string
      add :disabled, :boolean
      add :count, :integer, virtual: true
      add :tags, {:array, :string}, default: []
      add :state, :string
      add :visibility, :string, default: "public"
      add :origin, :string
      add :creator_id, :integer
      add :sql_text, :string, default: ""

      timestamps()
    end

    alter table(:users) do
      add :style_lang, :string, default: "css"
      add :db_type, :string, default: "postgresql"
    end

    alter table(:tasks) do
      add :type, :string, default: "algorithms"
    end

    alter table(:games) do
      add(:task_type, :string, default: "algorithms")
      add(:css_task_id, references(:css_tasks))
      add(:sql_task_id, references(:sql_tasks))
    end
  end
end
