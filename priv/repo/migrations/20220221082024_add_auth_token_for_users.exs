defmodule Codebattle.Repo.Migrations.AddAuthTokenForUsers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:users) do
      add(:auth_token, :string)
    end
  end
end
