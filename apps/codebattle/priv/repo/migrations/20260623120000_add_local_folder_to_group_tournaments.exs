defmodule Codebattle.Repo.Migrations.AddLocalFolderToGroupTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:local_folder, :string)
    end
  end
end
