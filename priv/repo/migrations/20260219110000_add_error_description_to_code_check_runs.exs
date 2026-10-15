defmodule Codebattle.Repo.Migrations.AddErrorDescriptionToCodeCheckRuns do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:code_check_runs) do
      add(:error_description, :text)
    end
  end
end
