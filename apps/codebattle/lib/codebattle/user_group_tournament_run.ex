defmodule Codebattle.UserGroupTournamentRun do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTask
  alias Codebattle.GroupTournament
  alias Codebattle.UserGroupTournament

  @statuses ~w(pending success error)

  @type t :: %__MODULE__{}

  schema "user_group_tournament_runs" do
    belongs_to(:user_group_tournament, UserGroupTournament)
    belongs_to(:group_task, GroupTask)
    belongs_to(:group_tournament, GroupTournament)

    field(:run_key, Ecto.UUID)
    field(:player_ids, {:array, :integer}, default: [])
    field(:status, :string)
    field(:result, :map, default: %{})

    timestamps()
  end

  def changeset(user_group_tournament_run, attrs \\ %{}) do
    user_group_tournament_run
    |> cast(attrs, [
      :user_group_tournament_id,
      :group_task_id,
      :group_tournament_id,
      :run_key,
      :player_ids,
      :status,
      :result
    ])
    |> validate_required([
      :user_group_tournament_id,
      :group_task_id,
      :group_tournament_id,
      :run_key,
      :player_ids,
      :status,
      :result
    ])
    |> validate_length(:player_ids, min: 1)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:run_key, name: :user_group_tournament_runs_user_group_tournament_id_run_key_ind)
    |> foreign_key_constraint(:user_group_tournament_id)
    |> foreign_key_constraint(:group_task_id)
    |> foreign_key_constraint(:group_tournament_id)
  end
end
