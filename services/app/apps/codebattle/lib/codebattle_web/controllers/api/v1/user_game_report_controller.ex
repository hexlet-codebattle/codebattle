defmodule CodebattleWeb.Api.V1.UserGameReportController do
  use CodebattleWeb, :controller

  # import Ecto.Changeset

  alias Codebattle.Game
  alias Codebattle.UserGameReport

  def create(conn, params) do
    %{
      "id" => game_id,
      "user_id" => reported_user_id,
      "reason" => reason,
      "comment" => comment
    } = params

    reporter = conn.assigns.current_user
    game = Game.Context.get_game!(game_id)

    is_reporter_player = Game.Helpers.is_player?(game, reporter.id)
    is_reported_user_player = Game.Helpers.is_player?(game, reported_user_id)

    case {is_reporter_player, is_reported_user_player} do
      {false, _} ->
        conn |> put_status(:forbidden) |> json(%{errors: ["not_a_player_of_game"]})

      {true, false} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: ["reported_user_not_a_player_of_game"]})

      {true, true} ->
        changeset = %UserGameReport{
          game_id: game.id,
          reporter_id: reporter.id,
          reported_user_id: reported_user_id,
          reason: reason,
          comment: comment
        }

        user_game_report = UserGameReport.changeset(changeset) |> Repo.insert!()

        conn |> put_status(:created) |> json(%{user_game_report: user_game_report})
    end
  end
end
