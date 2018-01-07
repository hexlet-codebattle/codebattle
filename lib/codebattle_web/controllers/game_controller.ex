defmodule CodebattleWeb.GameController do
  use Codebattle.Web, :controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller

  alias Codebattle.GameProcess.Play
  alias Codebattle.{Repo, Language}

  plug :authenticate_user when action in [:show, :create, :join, :check]

  def call(conn, opts) do
    try do
      super(conn, opts)
    catch
      :exit, _ ->
        conn
        |> put_status(:not_found)
        |> render(CodebattleWeb.ErrorView, "404.html", %{msg: gettext "Game not found"})
    end
  end

  def create(conn, _params) do
    id = Play.create_game(conn.assigns.user, conn.params["level"])
    conn
    |> redirect(to: game_path(conn, :show, id))
  end

  def show(conn, %{"id" => id}) do
    fsm = Play.get_fsm(id)
    langs = Repo.all(Language)
    conn = put_gon(conn, game_id: id, langs: langs)
    render conn, "show.html", %{fsm: fsm, layout_template: "full_width.html"}
  end

  def join(conn, %{"id" => id}) do
    case Play.join_game(id, conn.assigns.user) do
      {:ok, _} ->
        game = Play.get_fsm(id)
        CodebattleWeb.Endpoint.broadcast("lobby", "update:game", %{game: game})
        conn
        |> put_flash(:info, gettext "Joined to game")
        |> redirect(to: game_path(conn, :show, id))
      {{:error, reason}, _} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: game_path(conn, :show, id))
    end
  end
end
