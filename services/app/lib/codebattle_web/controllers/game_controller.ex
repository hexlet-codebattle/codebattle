defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller

  alias Codebattle.GameProcess.{Play, ActiveGames, Server}
  alias Codebattle.{Repo, Language}

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:create, :join])

  def create(conn, _params) do
    case Play.create_game(conn.assigns.current_user, conn.params["level"]) do
      {:ok, id} ->
        conn
        |> redirect(to: game_path(conn, :show, id))

      {:error, _reason} ->
        conn
        |> put_flash(:danger, gettext("You are in a different game"))
        |> redirect(to: page_path(conn, :index))
    end
  end

  def show(conn, %{"id" => id}) do
    case Server.game_pid(id) do
      :undefined ->
        case Play.get_game(id) do
          nil ->
            conn
            |> put_status(:not_found)
            |> render(CodebattleWeb.ErrorView, "404.html", %{msg: gettext("Game not found")})

          game ->
            render(conn, "game_result.html", %{game: game})
        end

      _pid ->
        fsm = Play.get_fsm(id)
        langs = Repo.all(Language)
        conn = put_gon(conn, game_id: id, langs: langs)
        is_participant = ActiveGames.participant?(id, conn.assigns.current_user.id)

        case {fsm.state, is_participant} do
          {:waiting_opponent, false} ->
            render(conn, "join.html", %{fsm: fsm})

          {:game_over, false} ->
            render(conn, "game_over.html", %{fsm: fsm})

          _ ->
            render(conn, "show.html", %{fsm: fsm, layout_template: "full_width.html"})
        end
    end
  end

  def join(conn, %{"id" => id}) do
    case Play.join_game(id, conn.assigns.current_user) do
      {:ok, fsm} ->
        CodebattleWeb.Endpoint.broadcast("lobby", "update:game", %{game: fsm})

        conn
        # |> put_flash(:info, gettext("Joined the game"))
        |> redirect(to: game_path(conn, :show, id))

      :error ->
        conn
        |> put_flash(:danger, gettext("You are in a different game"))
        |> redirect(to: page_path(conn, :index))
    end
  end
end
