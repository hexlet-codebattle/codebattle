defmodule CodebattleWeb.Api.V1.GameController do
  use CodebattleWeb, :controller

  alias Codebattle.Game
  alias CodebattleWeb.Api.GameView

  def completed(conn, params) do
    filters =
      case Map.get(params, "user_id") do
        nil -> %{}
        user_id -> %{user_id: user_id}
      end

    page_number = params |> Map.get("page", "1") |> String.to_integer()
    page_size = params |> Map.get("page_size", "20") |> String.to_integer()

    %{games: games, page_info: page_info} =
      Game.Query.get_completed_games(
        filters,
        %{page_number: page_number, page_size: page_size}
      )

    json(conn, %{games: GameView.render_completed_games(games), page_info: page_info})
  end
end
