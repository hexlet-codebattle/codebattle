defmodule CodebattleWeb.PageController do
  use Codebattle.Web, :controller

  alias Codebattle.GameProcess.Play
  alias Codebattle.Game

  def index(conn, _params) do
    case conn.assigns[:is_authenticated?] do
      true ->
        game_fsms = Play.list_fsms |> Enum.sort_by(fn (fsm) -> Game.level_difficulties[fsm.data.task.level] end)
        render(conn, "list.html", game_fsms: game_fsms)
      _ ->
        render conn, "index.html"
    end
  end
end
