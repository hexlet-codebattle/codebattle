defmodule Codebattle.Tournament.Types do
  defmodule Player do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false

    embedded_schema do
      field(:id, :integer)
      field(:public_id, :string)
      field(:github_id, :integer)
      field(:lang, :string)
      field(:name, :string)
      field(:rating, :integer)
      field(:guest, :boolean)
      field(:is_bot, :boolean)
      field(:game_result, :string, default: "waiting")
    end

    def changeset(struct, params) do
      struct
      |> cast(Map.from_struct(params), [
        :id,
        :name,
        :github_id,
        :rating,
        :guest,
        :is_bot,
        :game_result
      ])
    end
  end

  defmodule Match do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false
    @states ~w(waiting active canceled finished)

    embedded_schema do
      field(:state, :string)
      field(:game_id, :integer)
      embeds_many(:players, Player, on_replace: :delete)
    end

    def changeset(struct, params) do
      struct
      |> cast(params, [:state, :game_id])
      |> validate_inclusion(:state, @states)
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

  defmodule Message do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false

    embedded_schema do
      field(:content, :string)
    end

    def changeset(struct, params) do
      struct |> cast(params, [:content])
    end
  end
end
