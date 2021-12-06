defmodule Codebattle.UserEvent do
  @moduledoc """
    Represents user event

    auth controller events -> [
      "failure_auth", "user_is_authorized",
      "user_is_authenticated"
    ]

    game controller events -> [
      "create_game", "show_waiting_game_page",
      "show_playing_game_page", "show_waiting_game_page",
      "show_result_page", "show_archived_game_page",
      "join_created_game", "failure_join_game",
      "cancel_created_game"
    ]

    page controller events -> [
      "show_lobby_page"
    ]

    fallback controller events -> [
      "controller_unexpected_error"
    ]

    game channel events -> [
      "leave_playing_game_room", "change_solution_game",
      "give_up_game", "check_solution",
      "check_solution_error", "rematch_send_offer_game",
      "rematch_reject_offer_game", "rematch_accept_offer_game"
    ]

    chat channel events -> [
      "new_message_game"
    ]
  """

  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :event, :user_id, :data, :timestamp]}

  schema "user_events" do
    field(:event, :string)

    field(:user_id, :integer)
    field(:data, :map, default: %{})
    field(:date, :naive_datetime_usec)
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :event,
      :user_id,
      :data,
      :timestamp
    ])
    |> validate_required([:event, :user_id, :timestamp])
  end
end
