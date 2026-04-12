defmodule Codebattle.Repo.Migrations.AddAutoRedirectToGameToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:auto_redirect_to_game, :boolean, default: false, null: false)
    end
  end
end
