defmodule Codebattle.Repo.Migrations.AddUseTimer do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:use_timer, :boolean, null: false, default: true)
    end

    alter table(:tournaments) do
      add(:use_timer, :boolean, null: false, default: true)
    end
  end
end
