defmodule Codebattle.Repo.Migrations.AddFieldsToGame do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:timeout_seconds, :integer)
      add(:visibility_type, :string)
      add(:rematch_state, :string)
      add(:rematch_initiator_id, :integer)
      add(:players, :jsonb, default: "[]")
    end

    rename table(:games), :finishs_at, to: :finishes_at
  end
end
