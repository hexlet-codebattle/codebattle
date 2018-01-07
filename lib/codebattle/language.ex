defmodule Codebattle.Language do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Language

  @derive {Poison.Encoder, only: [:name, :slug, :version]}

  schema "languages" do
    field :name, :string
    field :slug, :string # Uniq lang name
    field :version, :string
    field :extension, :string
    field :docker_image, :string

    timestamps()
  end

  def changeset(%Language{} = language, attrs) do
    language
    |> cast(attrs, [:name, :slug, :version, :extension, :docker_image])
    |> validate_required([:name, :slug, :version, :extension, :docker_image])
  end
end
