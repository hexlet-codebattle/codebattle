defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias __MODULE__
  alias Tournament.Types

  @derive {Jason.Encoder,
           only: [
             :id,
             :type,
             :name,
             :state,
             :starts_at,
             :players_count,
             :data,
             :creator,
             :creator_id
           ]}

  @types ~w(individual team)
  @states ~w(waiting_participants canceled active finished)
  @difficulties ~w(elementary easy medium hard)
  @max_alive_tournaments 1
  @default_match_timeout Application.get_env(:codebattle, :tournament_match_timeout)

  schema "tournaments" do
    field(:name, :string)
    field(:type, :string, default: "individual")
    field(:difficulty, :string, default: "elementary")
    field(:state, :string, default: "waiting_participants")
    field(:default_language, :string, default: "js")
    field(:players_count, :integer, default: 16)
    field(:match_timeout_seconds, :integer, default: @default_match_timeout)
    field(:step, :integer, default: 0)
    field(:starts_at, :naive_datetime)
    field(:meta, :map, default: %{})
    field(:last_round_started_at, :naive_datetime)
    field(:module, :any, virtual: true, default: Tournament.Individual)
    embeds_one(:data, Types.Data, on_replace: :delete)

    belongs_to(:creator, Codebattle.User)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :name,
      :difficulty,
      :type,
      :step,
      :state,
      :starts_at,
      :match_timeout_seconds,
      :last_round_started_at,
      :players_count,
      :default_language,
      :meta
    ])
    |> cast_embed(:data)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:difficulty, @difficulties)
    |> validate_required([:name, :players_count, :starts_at])
    |> validate_alive_maximum(params)
    |> add_creator(params["creator"] || params[:creator])
  end

  def add_creator(changeset, nil), do: changeset

  def add_creator(changeset, creator) do
    change(changeset, %{creator: creator})
  end

  def validate_alive_maximum(changeset, params) do
    alive_count = params["alive_count"] || 0

    if alive_count < @max_alive_tournaments do
      changeset
    else
      add_error(
        changeset,
        :base,
        "Too many live tournaments: #{alive_count}, maximum allowed: #{@max_alive_tournaments}"
      )
    end
  end

  def types, do: @types
  def difficulties, do: @difficulties
end
