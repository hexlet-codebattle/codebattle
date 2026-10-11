defmodule Codebattle.Repo.Migrations.RemoveUseClanFromTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      remove(:use_clan, :boolean, null: false, default: false)
    end
  end
end
