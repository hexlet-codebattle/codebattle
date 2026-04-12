defmodule Codebattle.Repo.Migrations.RenamePerRoundTimeoutMode do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute("UPDATE tournaments SET timeout_mode = 'per_round_fixed' WHERE timeout_mode = 'per_round'")
  end

  def down do
    execute("UPDATE tournaments SET timeout_mode = 'per_round' WHERE timeout_mode = 'per_round_fixed'")
    execute("UPDATE tournaments SET timeout_mode = 'per_round' WHERE timeout_mode = 'per_round_with_rematch'")
  end
end
