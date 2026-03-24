defmodule Codebattle.Game.EditorEventBatch do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :user_id,
             :game_id,
             :tournament_id,
             :lang,
             :event_count,
             :window_start_offset_ms,
             :window_end_offset_ms,
             :batch_started_at,
             :batch_ended_at,
             :summary,
             :inserted_at
           ]}

  schema "game_editor_event_batches" do
    field(:lang, :string)
    field(:event_count, :integer)
    field(:window_start_offset_ms, :integer)
    field(:window_end_offset_ms, :integer)
    field(:batch_started_at, :utc_datetime_usec)
    field(:batch_ended_at, :utc_datetime_usec)
    field(:summary, :map, default: %{})

    belongs_to(:user, User)
    belongs_to(:game, Game)
    belongs_to(:tournament, Tournament)

    timestamps(updated_at: false)
  end

  def changeset(%__MODULE__{} = batch, attrs) do
    batch
    |> cast(attrs, [
      :user_id,
      :game_id,
      :tournament_id,
      :lang,
      :event_count,
      :window_start_offset_ms,
      :window_end_offset_ms,
      :batch_started_at,
      :batch_ended_at,
      :summary
    ])
    |> validate_required([
      :user_id,
      :game_id,
      :lang,
      :event_count,
      :window_start_offset_ms,
      :window_end_offset_ms,
      :batch_started_at,
      :batch_ended_at,
      :summary
    ])
    |> validate_number(:event_count, greater_than: 0)
    |> validate_number(:window_start_offset_ms, greater_than_or_equal_to: 0)
    |> validate_number(:window_end_offset_ms, greater_than_or_equal_to: 0)
    |> validate_window_offsets()
  end

  def create(attrs) do
    %__MODULE__{}
    |> changeset(attrs)
    |> Repo.insert()
  end

  def list_by_game(game_id) do
    __MODULE__
    |> where([batch], batch.game_id == ^game_id)
    |> order_by([batch], asc: batch.inserted_at, asc: batch.id)
    |> Repo.all()
  end

  defp validate_window_offsets(changeset) do
    start_offset = get_field(changeset, :window_start_offset_ms)
    end_offset = get_field(changeset, :window_end_offset_ms)

    if is_integer(start_offset) && is_integer(end_offset) && end_offset < start_offset do
      add_error(changeset, :window_end_offset_ms, "must be greater than or equal to window_start_offset_ms")
    else
      changeset
    end
  end
end
