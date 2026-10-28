defmodule Codebattle.Repo.Migrations.StoreCompetitiveReportCode do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:game_bot_detection_reports) do
      add :final_text, :text
      add :final_lang, :string
    end
  end
end
