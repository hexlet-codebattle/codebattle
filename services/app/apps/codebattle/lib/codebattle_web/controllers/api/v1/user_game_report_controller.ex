defmodule CodebattleWeb.Api.V1.UserGameReportController do
  use CodebattleWeb, :controller

  import Ecto.Changeset

  alias Codebattle.Game
  alias Codebattle.UserGameReport

  def create(conn, %{
        "id" => game_id,
        "user_id" => reported_user_id,
        "reason" => reason,
        "comment" => comment
      }) do
    reporter = conn.assigns.current_user
    game = Game.Context.get_game!(game_id)

    is_reporter_player = Game.Helpers.is_player?(game, reporter.id)
    is_reported_user_player = Game.Helpers.is_player?(game, reported_user_id)
    is_reported_himself = reporter.id == reported_user_id

    case {is_reporter_player, is_reported_himself, is_reported_user_player} do
      {false, _, _} ->
        conn |> put_status(:forbidden) |> json(%{errors: ["not_a_player_of_game"]})

      {_, true, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: ["cannot_report_himself"]})

      {_, _, false} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: [:reported_user_not_a_player_of_game]})

      {_, _, true} ->
        case UserGameReport.create(%{
               game_id: game.id,
               reporter_id: reporter.id,
               reported_user_id: reported_user_id,
               reason: reason,
               comment: comment
             }) do
          {:ok, user_game_report} ->
            conn |> put_status(:created) |> json(%{user_game_report: user_game_report})

          {:error, %Ecto.Changeset{} = changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{errors: translate_errors(changeset)})
        end
    end
  end

  def create(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: [:invalid_params]})
  end
end
