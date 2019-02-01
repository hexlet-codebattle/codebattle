defmodule Codebattle.Repo.Migrations.AddRatingDiffToUser do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :rating_diff, :integer
    end
  end
end
