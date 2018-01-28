defmodule Codebattle.Language do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Language

  @derive {Poison.Encoder, only: [:name, :slug, :version, :solution_template]}

  schema "languages" do
    field(:name, :string)
    # Uniq lang name
    field(:slug, :string)
    field(:version, :string)
    field(:extension, :string)
    field(:docker_image, :string)
    field(:solution_template, :string)

    timestamps()
  end

  def changeset(%Language{} = language, attrs) do
    language
    |> cast(attrs, [:name, :slug, :version, :extension, :docker_image, :solution_template])
    |> validate_required([:name, :slug, :version, :extension, :docker_image, :solution_template])
  end
end
