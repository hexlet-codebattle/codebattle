defmodule Codebattle.Onboarding.Session do
  @moduledoc false
  use Ecto.Schema

  schema "onboarding_sessions" do
    field :guest_id, :integer
    field :landed_at, :utc_datetime_usec
    field :setup_at, :utc_datetime_usec
    field :practice_started_at, :utc_datetime_usec
    field :first_check_at, :utc_datetime_usec
    field :solved_at, :utc_datetime_usec
    field :next_practice_at, :utc_datetime_usec
    field :signed_in_at, :utc_datetime_usec
    field :first_game_id, :integer
    field :first_lang, :string

    timestamps(type: :utc_datetime_usec)
  end
end
