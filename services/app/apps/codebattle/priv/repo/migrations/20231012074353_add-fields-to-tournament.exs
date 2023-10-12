defmodule :"Elixir.Codebattle.Repo.Migrations.Add-fields-to-tournament" do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:description, :string)
      add(:use_chat, :boolean)
    end
  end
end
