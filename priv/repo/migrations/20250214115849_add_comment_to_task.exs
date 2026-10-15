defmodule Codebattle.Repo.Migrations.AddCommentToTask do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:comment, :string)
    end
  end
end
