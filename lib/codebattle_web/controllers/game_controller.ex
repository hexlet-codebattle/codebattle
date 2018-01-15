defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller

  alias Codebattle.GameProcess.{Play, ActiveGames}
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
    case Play.create_game(conn.assigns.user, conn.params["level"]) do
      {:ok, id} ->
        conn
        |> redirect(to: game_path(conn, :show, id))
      {:error, _reason} ->
        conn
        |> put_flash(:danger, gettext "You are in a different game")
        |> redirect(to: page_path(conn, :index))
    end
  end

  def show(conn, %{"id" => id}) do
    fsm = Play.get_fsm(id)
    langs = Repo.all(Language)
    conn = put_gon(conn, game_id: id, langs: langs)
    is_participant = ActiveGames.participant?(id, conn.assigns.user.id)

    case {fsm.state, is_participant} do
      {:waiting_opponent, false} ->
        render conn, "join.html", %{fsm: fsm}
      {:game_over, false} ->
        render conn, "game_over.html", %{fsm: fsm}
      _ ->
        render conn, "show.html", %{fsm: fsm, layout_template: "full_width.html"}
    end
  end

  def join(conn, %{"id" => id}) do
    case Play.join_game(id, conn.assigns.user) do
      {:ok, fsm} ->
        CodebattleWeb.Endpoint.broadcast("lobby", "update:game", %{game: fsm})
        conn
        |> put_flash(:info, gettext "Joined to game")
        |> redirect(to: game_path(conn, :show, id))
      :error ->
        conn
        |> put_flash(:danger, gettext "You are in a different game")
        |> redirect(to: game_path(conn, :show, id))
    end
  end
end
