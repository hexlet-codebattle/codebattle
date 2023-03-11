defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.AtomizedMap
  alias Codebattle.Tournament.Individual

  @derive {Jason.Encoder,
           only: [
             :creator,
             :creator_id,
             :level,
             :id,
             :is_live,
             :matches,
             :meta,
             :name,
             :players,
             :players_limit,
             :starts_at,
             :state,
             :type
           ]}

  @access_types ~w(public token)
  @levels ~w(elementary easy medium hard)
  @states ~w(waiting_participants canceled active finished)
  @types ~w(individual team stairway)

  @max_alive_tournaments 7
  @default_match_timeout Application.compile_env(:codebattle, :tournament_match_timeout)

  schema "tournaments" do
    field(:access_token, :string)
    field(:access_type, :string, default: "public")
    field(:current_round, :integer, default: 0)
    field(:default_language, :string, default: "js")
    field(:is_live, :boolean, virtual: true, default: false)
    field(:last_round_started_at, :naive_datetime)
    field(:level, :string, default: "elementary")
    field(:match_timeout_seconds, :integer, default: @default_match_timeout)
    field(:matches, AtomizedMap, default: %{})
    field(:players, AtomizedMap, default: %{})
    field(:meta, AtomizedMap, default: %{})
    field(:module, :any, virtual: true, default: Individual)
    field(:name, :string)
    field(:players_limit, :integer)
    field(:players_count, :integer, virtual: true, default: 0)
    field(:starts_at, :utc_datetime)
    field(:state, :string, default: "waiting_participants")
    field(:task_strategy, :string, default: "random")
    field(:type, :string, default: "individual")

    belongs_to(:creator, Codebattle.User)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :name,
      :level,
      :type,
      :access_type,
      :access_token,
      :current_round,
      :task_strategy,
      :state,
      :starts_at,
      :match_timeout_seconds,
      :last_round_started_at,
      :players_limit,
      :players_count,
      :default_language,
      :meta,
      :players,
      :matches
    ])
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:access_type, @access_types)
    |> validate_inclusion(:level, @levels)
    |> validate_required([:name, :starts_at])
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
  def access_types, do: @access_types
  def levels, do: @levels
end
