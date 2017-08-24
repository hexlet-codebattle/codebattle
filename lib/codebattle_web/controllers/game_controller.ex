defmodule CodebattleWeb.GameController do
  use Codebattle.Web, :controller

  alias Codebattle.Play

  plug :authenticate_user when action in [:index, :show, :create, :join, :check]

  def call(conn, opts) do
    try do
      super(conn, opts)
    catch
      :exit, _ ->
        conn
        |> put_status(:not_found)
        |> render(CodebattleWeb.ErrorView, "404.html", %{msg: "Game not found"})
    end
  end

  def index(conn, _params) do
    render(conn, "index.html", game_fsms: Play.list_fsms)
  end

  def create(conn, _params) do
    id = Play.create_game(conn.assigns.user)
    conn
    |> put_flash(:info, "Game has been created")
    |> redirect(to: game_path(conn, :show, id))
  end

  def show(conn, %{"id" => id}) do
    fsm = Play.get_fsm(id)
    render conn, "show.html", fsm: fsm
  end

  def join(conn, %{"id" => id}) do
    case Play.join_game(id, conn.assigns.user) do
      {:ok, _} ->
        conn
        |> put_flash(:info, "Joined to game")
        |> redirect(to: game_path(conn, :show, id))
      {{:error, reason}, _} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: game_path(conn, :show, id))
    end
  end

  def check(conn, %{"id" => id}) do
    {:ok, fsm} = Codebattle.Play.check_game(id, conn.assigns.user)
    flash =
      case fsm.state do
        :player_won -> "Yay, you won the game!"
        _ -> "You lose the game"
      end
    conn
    |> put_flash(:info, flash)
    |> redirect(to: game_path(conn, :index))
  end
end
