defmodule Codebattle.Repo.Migrations.AddUserEvents do
  use Ecto.Migration

  def change do
    create table("user_events") do
      add(:event, :string)
      add(:user_id, :integer)
      add(:data, :jsonb, default: "{}")
      add(:date, :naive_datetime_usec)
    end
  end
end
