defmodule Codebattle.Repo.Migrations.AddReplyToFeedback do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:feedback) do
      add(:reply, :text)
      add(:replied_at, :naive_datetime)
    end
  end
end
