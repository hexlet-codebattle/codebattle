defmodule Codebattle.Tournament.Types do
  defmodule Player do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false

    embedded_schema do
      field(:id, :integer)
      field(:github_id, :integer)
      field(:name, :string)
      field(:rating, :integer)
      field(:guest, :boolean)
    end

    def changeset(struct, params) do
      struct
      |> cast(Map.from_struct(params), [:id, :name, :github_id, :rating, :guest])
    end
  end

  defmodule Match do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false

    embedded_schema do
      field(:state, :string)
      embeds_many(:players, Player, on_replace: :delete)
    end

    def changeset(struct, params) do
      struct
      |> cast(params, [:state])
      |> cast_embed(:players)
    end
  end

  defmodule Data do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false

    embedded_schema do
      embeds_many(:players, Player, on_replace: :delete)
      embeds_many(:matches, Match)
    end

    def changeset(struct, params) do
      struct
      |> cast(params, [])
      |> cast_embed(:matches)
      |> cast_embed(:players)
    end
  end
end
