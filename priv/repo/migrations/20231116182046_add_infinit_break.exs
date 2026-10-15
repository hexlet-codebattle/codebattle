defmodule Codebattle.Repo.Migrations.AddInfinitBreak do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:use_infinite_break, :boolean)
    end
  end
end
