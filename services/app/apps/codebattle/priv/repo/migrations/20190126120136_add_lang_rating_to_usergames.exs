defmodule Codebattle.Repo.Migrations.AddLangRatingToUsergames do
  use Ecto.Migration

  def change do
    alter table(:user_games) do
      add(:rating, :integer)
      add(:rating_diff, :integer)
      add(:lang, :string)
    end
  end
end
