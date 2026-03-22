defmodule Codebattle.Repo.Migrations.AddExternalOauthLoginToUsers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:external_oauth_login, :string)
    end
  end
end
