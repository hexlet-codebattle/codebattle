defmodule Codebattle.Repo.Migrations.AddTickerToEvent do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:events) do
      add(:ticker_text, :text)
    end
  end
end
