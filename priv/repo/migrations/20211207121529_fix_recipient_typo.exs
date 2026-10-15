defmodule Codebattle.Repo.Migrations.FixRecipientTypo do
  @moduledoc false
  use Ecto.Migration

  def change do
    rename table(:invites), :recepient_id, to: :recipient_id
  end
end
