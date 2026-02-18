defmodule Codebattle.UserAchievement do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @types [
    :games_played_milestone,
    :graded_tournaments_played_milestone,
    :polyglot,
    :highest_tournament_win_grade,
    :season_champion_wins,
    :grand_slam_champion_wins,
    :best_win_streak,
    :game_stats,
    :tournaments_stats
  ]

  schema "user_achievements" do
    belongs_to(:user, Codebattle.User)

    field(:type, Ecto.Enum, values: @types)
    field(:meta, :map, default: %{})

    timestamps()
  end

  def changeset(achievement, attrs) do
    achievement
    |> cast(attrs, [:user_id, :type, :meta])
    |> validate_required([:user_id, :type, :meta])
    |> unique_constraint([:user_id, :type])
  end

  def types, do: @types
end
