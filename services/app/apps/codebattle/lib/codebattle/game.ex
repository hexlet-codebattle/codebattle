defmodule Codebattle.Game do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.Game
  alias Codebattle.Game.Player

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :award,
             :finishes_at,
             :id,
             :is_bot,
             :is_live,
             :is_tournament,
             :task_type,
             :level,
             :locked,
             :mode,
             :players,
             :ref,
             :starts_at,
             :state,
             :grade,
             :type,
             :use_chat,
             :use_timer,
             :visibility_type
           ]}

  @default_timeout_seconds div(to_timeout(minute: 30), 1000)
  @states ~w(initial builder waiting_opponent playing game_over timeout canceled)
  @rematch_states ~w(none in_approval rejected accepted)
  @task_types ~w(algorithms css sql)

  @types ~w(solo duo multi)
  @modes ~w(standard builder training)
  @visibility_types ~w(hidden public)

  schema "games" do
    belongs_to(:css_task, Codebattle.CssTask)
    belongs_to(:task, Codebattle.Task)
    belongs_to(:tournament, Codebattle.Tournament)
    belongs_to(:round, Codebattle.Tournament.Round)
    belongs_to(:sql_task, Codebattle.SqlTask)
    has_many(:user_games, Codebattle.UserGame)
    has_many(:users, through: [:user_games, :user])
    has_one(:playbook, Codebattle.Playbook)
    embeds_many(:players, Player, on_replace: :delete)

    field(:duration_sec, :integer)
    field(:finishes_at, :naive_datetime)
    field(:level, :string)
    field(:mode, :string, default: "standard")
    field(:player_ids, {:array, :integer}, default: [])
    field(:ref, :integer)
    field(:rematch_initiator_id, :integer)
    field(:rematch_state, :string, default: "none")
    field(:round_position, :integer)
    field(:starts_at, :naive_datetime)
    field(:state, :string)
    field(:grade, :string)
    field(:timeout_seconds, :integer, default: @default_timeout_seconds)
    field(:type, :string, default: "duo")
    field(:use_chat, :boolean, default: true)
    field(:use_timer, :boolean, default: true)
    field(:visibility_type, :string, default: "public")
    field(:was_cheated, :boolean, default: false)

    field(:award, :string, virtual: true)
    field(:is_bot, :boolean, default: false, virtual: true)
    field(:is_live, :boolean, default: false, virtual: true)
    field(:is_tournament, :boolean, default: false, virtual: true)
    field(:locked, :boolean, default: false, virtual: true)
    field(:task_type, :string, default: "algorithms")

    timestamps()
  end

  @doc false
  def changeset(%Game{} = game, attrs) do
    game
    |> cast(attrs, [
      :award,
      :duration_sec,
      :finishes_at,
      :level,
      :locked,
      :mode,
      :ref,
      :rematch_initiator_id,
      :rematch_state,
      :round_id,
      :round_position,
      :starts_at,
      :state,
      :grade,
      :player_ids,
      :task_id,
      :task_type,
      :css_task_id,
      :sql_task_id,
      :timeout_seconds,
      :tournament_id,
      :type,
      :use_chat,
      :use_timer,
      :visibility_type,
      :was_cheated
    ])
    |> validate_required([:state, :level, :type, :mode])
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:task_type, @task_types)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:grade, Codebattle.Tournament.grades())
    |> validate_inclusion(:mode, @modes)
    |> validate_inclusion(:visibility_type, @visibility_types)
    |> validate_inclusion(:rematch_state, @rematch_states)
    |> put_players(attrs)
    |> put_task(attrs)
    |> put_css_task(attrs)
    |> put_sql_task(attrs)
  end

  defp put_players(changeset, %{players: players}), do: put_embed(changeset, :players, players)
  defp put_players(changeset, _attrs), do: changeset

  defp put_task(changeset, %{task: task}), do: put_assoc(changeset, :task, task)
  defp put_task(changeset, _attrs), do: changeset

  defp put_css_task(changeset, %{css_task: task}), do: put_assoc(changeset, :css_task, task)
  defp put_css_task(changeset, _attrs), do: changeset

  defp put_sql_task(changeset, %{sql_task: task}), do: put_assoc(changeset, :sql_task, task)
  defp put_sql_task(changeset, _attrs), do: changeset
end
