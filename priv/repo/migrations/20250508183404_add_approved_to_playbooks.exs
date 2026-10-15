defmodule Codebattle.Repo.Migrations.AddApprovedToPlaybooks do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:playbooks) do
      add :approved, :boolean, default: false, null: false
    end
  end
end
