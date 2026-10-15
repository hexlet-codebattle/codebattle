defmodule Codebattle.Repo.Migrations.AddGradeToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:grade, :text, null: false, default: "open")
    end
  end
end
