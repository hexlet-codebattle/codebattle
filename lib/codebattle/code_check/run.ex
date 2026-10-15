defmodule Codebattle.CodeCheck.Run do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.CodeCheck.Run

  @results ~w(ok failure error service_timeout service_failure)

  schema "code_check_runs" do
    field(:user_id, :integer)
    field(:game_id, :integer)
    field(:tournament_id, :integer)
    field(:lang, :string)
    field(:started_at, :utc_datetime_usec)
    field(:duration_ms, :integer)
    field(:result, :string)
    field(:error_description, :string)
  end

  def changeset(%Run{} = run, attrs) do
    run
    |> cast(attrs, [
      :user_id,
      :game_id,
      :tournament_id,
      :lang,
      :started_at,
      :duration_ms,
      :result,
      :error_description
    ])
    |> validate_required([:game_id, :lang, :started_at, :duration_ms, :result])
    |> validate_inclusion(:result, @results)
    |> validate_number(:duration_ms, greater_than_or_equal_to: 0)
  end
end
