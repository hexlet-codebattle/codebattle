defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Tournament.Types

  @derive {Poison.Encoder, only: [:id, :name, :state, :starts_at, :players_count, :data]}

  @types ~w(individual team)
  @states ~w(waiting_participants canceled active finished)
  @starts_at_types ~w(1_min 5_min 10_min 30_min)

  schema "tournaments" do
    field(:name, :string)
    field(:type, :string, default: "individual")
    field(:state, :string, default: "waiting_participants")
    field(:players_count, :integer, default: 16)
    field(:step, :integer, default: 0)
    field(:starts_at, :naive_datetime)
    field(:starts_at_type, :string, virtual: true, default: "5_min")
    field(:meta, :map, default: %{})
    embeds_one(:data, Types.Data, on_replace: :delete)

    belongs_to(:creator, Codebattle.User)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :type, :step, :state, :starts_at, :players_count, :creator_id, :meta])
    |> cast_embed(:data)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:starts_at_type, @starts_at_types)
    |> validate_required([:name, :players_count, :creator_id, :starts_at])
  end

  def get!(id) do
    Codebattle.Repo.get!(Codebattle.Tournament, id)
  end

  def all() do
    query =
      from(
        t in Codebattle.Tournament,
        order_by: [desc: t.inserted_at],
        preload: :creator
      )

    Codebattle.Repo.all(query)
  end

  def types, do: @types
  def starts_at_types, do: @starts_at_types
end
