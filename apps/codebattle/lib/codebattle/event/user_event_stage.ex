defmodule Codebattle.UserEvent.Stage do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  @statuses [:pending, :started, :completed, :failed, :passed]
  @entrance_results [:passed, :not_passed]

  @derive {Jason.Encoder,
           only: [
             :id,
             :slug,
             :status,
             :tournament_id,
             :entrance_result,
             :place_in_total_rank,
             :place_in_category_rank,
             :games_count,
             :score,
             :time_spent_in_seconds,
             :wins_count,
             :started_at,
             :finished_at
           ]}

  schema "user_event_stages" do
    belongs_to(:user_event, Codebattle.UserEvent)

    field(:slug, :string)
    field(:status, Ecto.Enum, values: @statuses)
    field(:tournament_id, :integer)
    field(:entrance_result, Ecto.Enum, values: @entrance_results)
    field(:place_in_total_rank, :integer)
    field(:place_in_category_rank, :integer)
    field(:games_count, :integer)
    field(:score, :integer)
    field(:time_spent_in_seconds, :integer)
    field(:wins_count, :integer)
    field(:started_at, :utc_datetime)
    field(:finished_at, :utc_datetime)

    timestamps()
  end

  def changeset(stage, attrs) do
    stage
    |> cast(attrs, [
      :slug,
      :status,
      :tournament_id,
      :entrance_result,
      :place_in_total_rank,
      :place_in_category_rank,
      :games_count,
      :score,
      :time_spent_in_seconds,
      :wins_count,
      :started_at,
      :finished_at
    ])
    |> validate_required([:slug, :status])
  end
end
