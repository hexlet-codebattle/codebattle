defmodule Codebattle.Game do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.Game
  alias Codebattle.Game.Player

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :players,
             :level,
             :state,
             :starts_at,
             :finishes_at,
             :type,
             :mode,
             :visibility_type,
             :is_live,
             :is_bot,
             :is_tournament
           ]}

  @default_timeout_seconds div(:timer.minutes(30), 1000)
  @states ~w(initial waiting_opponent playing game_over timeout canceled)
  @rematch_states ~w(none in_approval rejected accepted)

  @types ~w(solo duo multi)
  @modes ~w(standard training)
  @visibility_types ~w(hidden public)

  schema "games" do
    field(:state, :string)
    field(:level, :string)
    field(:type, :string, default: "duo")
    field(:mode, :string, default: "standard")
    field(:visibility_type, :string, default: "public")
    field(:timeout_seconds, :integer, default: @default_timeout_seconds)
    field(:starts_at, :naive_datetime)
    field(:finishes_at, :naive_datetime)
    field(:rematch_state, :string, default: "none")
    field(:rematch_initiator_id, :integer)
    field(:is_live, :boolean, default: false, virtual: true)
    field(:is_bot, :boolean, default: false, virtual: true)
    field(:is_tournament, :boolean, default: false, virtual: true)

    timestamps()

    belongs_to(:task, Codebattle.Task)
    belongs_to(:tournament, Codebattle.Tournament)
    has_many(:user_games, Codebattle.UserGame)
    has_many(:users, through: [:user_games, :user])
    embeds_many(:players, Player, on_replace: :delete)
  end

  @doc false
  def changeset(%Game{} = game, attrs) do
    game
    |> cast(attrs, [
      :state,
      :type,
      :mode,
      :visibility_type,
      :rematch_state,
      :rematch_initiator_id,
      :task_id,
      :tournament_id,
      :timeout_seconds,
      :level,
      :starts_at,
      :finishes_at
    ])
    |> validate_required([:state, :level, :type, :mode])
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:mode, @modes)
    |> validate_inclusion(:visibility_type, @visibility_types)
    |> validate_inclusion(:rematch_state, @rematch_states)
    |> put_players(attrs)
    |> put_task(attrs)
  end

  defp put_players(changeset, %{players: players}), do: put_embed(changeset, :players, players)
  defp put_players(changeset, _attrs), do: changeset

  defp put_task(changeset, %{task: task}), do: put_assoc(changeset, :task, task)
  defp put_task(changeset, _attrs), do: changeset
end
