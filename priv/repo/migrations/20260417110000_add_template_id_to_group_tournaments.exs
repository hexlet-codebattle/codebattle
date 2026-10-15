defmodule Codebattle.Repo.Migrations.AddTemplateIdToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:template_id, :string)
    end
  end
end
