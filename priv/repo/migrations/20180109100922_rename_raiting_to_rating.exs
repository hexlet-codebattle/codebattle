defmodule Codebattle.Repo.Migrations.RenameRaitingToRating do
  @moduledoc false
  use Ecto.Migration

  def change do
    rename table(:users), :raiting, to: :rating
  end
end
