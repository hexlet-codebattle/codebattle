defmodule CodebattleWeb.Api.V1.UserGameReportController do
  use CodebattleWeb, :controller

  alias Codebattle.Game
  alias Codebattle.UserGameReport

  def create(conn, %{"game_id" => game_id, "offender_id" => offender_id, "reason" => reason, "comment" => comment}) do
    reporter = conn.assigns.current_user
    game = Game.Context.get_game!(game_id)

    is_reporter_player = Game.Helpers.player?(game, reporter.id)
    is_offender_player = Game.Helpers.player?(game, offender_id)
    is_reported_himself = reporter.id == offender_id

    case {is_reporter_player, is_reported_himself, is_offender_player} do
      {false, _, _} ->
        conn |> put_status(:forbidden) |> json(%{errors: ["not_a_player_of_game"]})

      {_, true, _} ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: ["cannot_report_himself"]})

      {_, _, false} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: [:offender_not_a_player_of_game]})

      {_, _, true} ->
        case UserGameReport.create(%{
               game_id: game.id,
               reporter_id: reporter.id,
               tournament_id: game.tournament_id,
               offender_id: offender_id,
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
