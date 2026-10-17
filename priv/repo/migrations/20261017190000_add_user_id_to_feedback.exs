defmodule Codebattle.Repo.Migrations.AddUserIdToFeedback do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:feedback) do
      # Who sent it: users list their own feedback, admins see all. Older rows only have
      # the client-supplied author_name, so they stay admin-only.
      add(:user_id, references(:users, on_delete: :nilify_all))
      # Was varchar(255): longer messages failed to insert.
      modify(:text, :text, from: :string)
    end

    create(index(:feedback, [:user_id]))
  end
end
