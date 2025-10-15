defmodule Codebattle.Repo.Migrations.AddGradeToGame do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:grade, :string, default: "open", null: false)
    end
  end
end
