defmodule Codebattle.Game do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.Game
  alias Codebattle.Game.Player

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:id, :users, :state, :starts_at, :finishes_at]}

  @states ~w(initial waiting_opponent playing game_over timeout canceled)
  @rematch_states ~w(none in_approval rejected accepted)

  @types ~w(standard bot training)
  @visibility_types ~w(hidden public)

  schema "games" do
    field(:state, :string)
    field(:level, :string)
    field(:type, :string)
    field(:visibility_type, :string, default: "public")
    field(:timeout_seconds, :integer, default: 30 * 60)
    field(:starts_at, :naive_datetime)
    field(:finishes_at, :naive_datetime)
    field(:rematch_state, :string, default: "none")
    field(:rematch_initiator_id, :integer)
    field(:langs, {:array, :map}, default: [], virtual: true)
    field(:is_live, :boolean, default: false, virtual: true)

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
      :visibility_type,
      :rematch_state,
      :rematch_initiator_id,
      :task_id,
      :tournament_id,
      :level,
      :starts_at,
      :finishes_at
    ])
    |> validate_required([:state, :level, :type])
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:state, @states)
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
