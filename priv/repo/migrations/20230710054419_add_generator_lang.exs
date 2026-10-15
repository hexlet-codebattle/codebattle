defmodule Codebattle.Repo.Migrations.AddGeneratorLang do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add(:generator_lang, :string, default: "")
    end
  end
end
