defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller

  alias Codebattle.GameProcess.{Play, ActiveGames, Server}
  alias Codebattle.{Languages}

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:create, :join])

  def create(conn, _params) do
    type = case conn.params["type"] do
     "withFriend" -> "private"
     _ -> "public"
    end

    case Play.create_game(conn.assigns.current_user, conn.params["level"], type) do
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
            |> put_view(CodebattleWeb.ErrorView)
            |> render("404.html", %{msg: gettext("Game not found")})

          game ->
            render(conn, "game_result.html", %{game: game})
        end

      _pid ->
        fsm = Play.get_fsm(id)
        langs = Languages.meta() |> Map.values()
        conn = put_gon(conn, game_id: id, langs: langs)
        is_participant = ActiveGames.participant?(id, conn.assigns.current_user.id)

        case {fsm.state, is_participant} do
          {:waiting_opponent, false} ->
            render(conn, "join.html", %{fsm: fsm})

          # {:game_over, false} ->
          # render(conn, "game_over.html", %{fsm: fsm})

          _ ->
            render(conn, "show.html", %{fsm: fsm, layout_template: "full_width.html"})
        end
    end
  end

  def join(conn, %{"id" => id}) do
    try do
      case Play.join_game(id, conn.assigns.current_user) do
        {:ok, fsm} ->
          Task.async(fn ->
            CodebattleWeb.Endpoint.broadcast("lobby", "game:update", %{
              game: fsm,
              game_info: Play.game_info(id)
            })
          end)

          conn
          # |> put_flash(:info, gettext("Joined the game"))
          |> redirect(to: game_path(conn, :show, id))

        :error ->
          conn
          |> put_flash(:danger, gettext("You are in a different game"))
          |> redirect(to: page_path(conn, :index))
      end
    catch
      :exit, _ ->
        conn
        |> put_flash(:danger, gettext("Sorry, the game doesn't exist"))
        |> redirect(to: page_path(conn, :index))
    end
  end

  def delete(conn, %{"id" => id}) do
    case Play.cancel_game(id, conn.assigns.current_user) do
      :ok ->
        CodebattleWeb.Endpoint.broadcast("lobby", "game:cancel", %{game_id: id})
        redirect(conn, to: page_path(conn, :index))

      :error ->
        conn
        |> put_flash(:danger, gettext("You are in a different game"))
        |> redirect(to: page_path(conn, :index))
    end
  end
end
