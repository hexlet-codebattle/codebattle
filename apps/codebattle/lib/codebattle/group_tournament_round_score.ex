defmodule Codebattle.GroupTournamentRoundScore do
  @moduledoc """
  Per-round, per-player score record for a group tournament.

  One row is inserted at the end of each slice round for each player who
  participated in that round's slice run. Stores which slice the player
  was in, the place they finished, and the round points awarded.
  """

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTournament
  alias Codebattle.User
  alias Codebattle.UserGroupTournamentRun

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :group_tournament_id,
             :user_id,
             :run_id,
             :round_position,
             :slice_index,
             :place,
             :score,
             :inserted_at
           ]}

  schema "group_tournament_round_scores" do
    belongs_to(:group_tournament, GroupTournament)
    belongs_to(:user, User)
    belongs_to(:run, UserGroupTournamentRun)

    field(:round_position, :integer)
    field(:slice_index, :integer)
    field(:place, :integer)
    field(:score, :integer, default: 0)

    timestamps()
  end

  def changeset(record, attrs \\ %{}) do
    record
    |> cast(attrs, [
      :group_tournament_id,
      :user_id,
      :run_id,
      :round_position,
      :slice_index,
      :place,
      :score
    ])
    |> validate_required([:group_tournament_id, :user_id, :round_position, :slice_index, :score])
    |> validate_number(:round_position, greater_than: 0)
    |> validate_number(:slice_index, greater_than_or_equal_to: 0)
    |> validate_number(:place, greater_than: 0)
    |> validate_number(:score, greater_than_or_equal_to: 0)
    |> unique_constraint([:group_tournament_id, :user_id, :round_position],
      name: :group_tournament_round_scores_tournament_user_round_index
    )
    |> foreign_key_constraint(:group_tournament_id)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:run_id)
  end
end
