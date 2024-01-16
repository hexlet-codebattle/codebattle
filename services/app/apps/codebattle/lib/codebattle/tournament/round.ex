defmodule Codebattle.Tournament.Round do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Tournament

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :name,
             :state,
             :level,
             :task_provider,
             :task_strategy,
             :round_timeout_seconds,
             :break_duration_seconds,
             :use_infinite_break,
             :tournament_id,
             :tournament_type,
             :player_ids,
             :task_pack_id
           ]}

  @states ~w(active disabled)

  schema "rounds" do
    field(:name, :string)
    field(:state, :string)
    field(:level, :string)
    field(:task_provider, :string)
    field(:task_strategy, :string)
    field(:round_timeout_seconds, :integer)
    field(:break_duration_seconds, :integer)
    field(:use_infinite_break, :boolean, default: false)

    field(:tournament_type, :string, default: "individual")
    field(:player_ids, {:array, :integer}, default: [])

    field(:task_pack_id, :integer)

    belongs_to(:tournament, Codebattle.Tournament)
    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :break_duration_seconds,
      :level,
      :round_timeout_seconds,
      :name,
      :state,
      :task_strategy,
      :tournament_id,
      :tournament_type,
      :use_infinite_break,
      :module,
      :task_pack_id
    ])
    |> validate_inclusion(:level, Tournament.levels())
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:task_provider, Tournament.task_providers())
    |> validate_inclusion(:task_strategy, Tournament.task_strategies())
    |> validate_inclusion(:tournament_type, Tournament.types())
    |> validate_number(:round_timeout_seconds, greater_than_or_equal_to: 1)
  end

  def disable_all_rounds(tournament_id) do
    from(
      r in __MODULE__,
      where: r.tournament_id == ^tournament_id and r.state == "active",
      update: [set: [state: "disabled"]]
    )
    |> Codebattle.Repo.update_all([])
  end

  def states, do: @states
end
