defmodule Codebattle.Repo.Migrations.RenameRaitingToRating do
  use Ecto.Migration

  def change do
    rename table(:users), :raiting, to: :rating
  end
end
