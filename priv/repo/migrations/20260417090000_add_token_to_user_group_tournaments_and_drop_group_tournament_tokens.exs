defmodule Codebattle.Repo.Migrations.AddTokenToUserGroupTournamentsAndDropGroupTournamentTokens do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute("ALTER TABLE user_group_tournaments ADD COLUMN IF NOT EXISTS token text")

    create_if_not_exists(unique_index(:user_group_tournaments, [:token]))

    drop_if_exists(table(:group_tournament_tokens))
  end

  def down do
    create table(:group_tournament_tokens) do
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all), null: false)
      add(:token, :text)

      timestamps()
    end

    create(unique_index(:group_tournament_tokens, [:token]))
    create(unique_index(:group_tournament_tokens, [:user_id, :group_tournament_id]))

    drop_if_exists(index(:user_group_tournaments, [:token]))

    alter table(:user_group_tournaments) do
      remove(:token)
    end
  end
end
