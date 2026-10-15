defmodule Codebattle.Repo.Migrations.UpdateTask do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:input_signature, :jsonb, default: "[]")
      add(:output_signature, :jsonb, default: "{}")
    end
  end
end
