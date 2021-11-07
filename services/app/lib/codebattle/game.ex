defmodule Codebattle.Game do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.Game
  alias Codebattle.Game.Player

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:id, :users, :state, :starts_at, :finishes_at]}

  @states ~w(initial waiting_opponent playing game_over timeout)
  @rematch_states ~w(none in_approval rejected accepted)

  @types ~w(standard bot tournament)
  @visibility_types ~w(hidden public)

  schema "games" do
    field(:state, :string)
    field(:level, :string)
    field(:type, :string)
    field(:starts_at, :naive_datetime)
    field(:finishes_at, :naive_datetime)
    field(:timeout_seconds, :integer, default: 15 * 60)
    field(:visibility_type, :string, default: "public")
    field(:rematch_state, :string, default: "none")
    field(:rematch_initiator_id, :integer)
    field(:langs, {:array, :map}, default: [], virtual: true)
    field(:is_active, :boolean, default: false, virtual: true)

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
    |> cast(attrs, [:state, :task_id, :tournament_id, :level, :type, :starts_at, :finishes_at])
    |> validate_required([:state, :level, :type])
    |> validate_inclusion(:type, @types)
    |> cast_embed(:players)
  end
end
