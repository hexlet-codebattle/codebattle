defmodule Codebattle.Repo.Migrations.AddTimezoneToStartsAt do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      modify(:starts_at, :utc_datetime)
    end
  end
end
