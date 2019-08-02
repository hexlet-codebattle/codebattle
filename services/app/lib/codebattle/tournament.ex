defmodule Codebattle.Tournament do
  @moduledoc false

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

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @derive {Poison.Encoder, only: [:id, :name, :state, :starts_at, :players_count, :data]}

  schema "tournaments" do
    field(:name, :string)
    field(:state, :string, default: "waiting_participants")
    field(:players_count, :integer)
    field(:starts_at, :naive_datetime)
    embeds_one(:data, Data, on_replace: :delete)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :state, :starts_at, :players_count])
    |> cast_embed(:data)
    |> validate_required([:name, :players_count])
  end

  def actual() do
    query =
      from(
        t in Codebattle.Tournament,
        order_by: [desc: t.inserted_at],
        limit: 1
      )

    Codebattle.Repo.one!(query)
  end
end
