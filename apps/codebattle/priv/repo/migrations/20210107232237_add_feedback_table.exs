defmodule Codebattle.Repo.Migrations.AddFeedbackTable do
  use Ecto.Migration

  def change do
    create table("feedback") do
      add(:author_name, :string)
      add(:status, :string)
      add(:text, :string)
      add(:title_link, :string)

      timestamps()
    end
  end
end
