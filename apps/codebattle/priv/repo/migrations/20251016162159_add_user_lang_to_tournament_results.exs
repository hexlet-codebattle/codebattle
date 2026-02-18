defmodule Codebattle.Repo.Migrations.AddUserLangToTournamentResults do
  use Ecto.Migration

  def change do
    alter table(:tournament_user_results) do
      add(:user_lang, :string)
    end

    alter table(:tournament_results) do
      add(:user_lang, :string)
    end
  end
end
