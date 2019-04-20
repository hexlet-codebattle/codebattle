defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller
  require Logger

  alias Codebattle.GameProcess.{Play, ActiveGames, Server}
  alias Codebattle.{Languages}

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:create, :join])

  def create(conn, _params) do
    type =
      case conn.params["type"] do
        "withFriend" -> "private"
        "private" -> "private"
        _ -> "public"
      end

    game_params = conn.params
      |> Map.take(["level", "type"])
      |> Map.merge(%{"type" => type})
      |> Map.merge(%{"timeout_seconds" => timeout_seconds(conn.params)})

    case Play.create_game(conn.assigns.current_user, game_params) do
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
        # TODO: move to Play.ex; @mimikria, we miss you))))
        {:ok, fsm} ->
          conn
          # |> put_flash(:info, gettext("Joined the game"))
          |> redirect(to: game_path(conn, :show, id))

        {:error, reason} ->
          conn
          |> put_flash(:danger, reason)
          |> redirect(to: page_path(conn, :index))
      end
    catch
      :exit, reason ->
        Logger.error(inspect(reason))

        conn
        |> put_flash(:danger, "Sorry, the game doesn't exist")
        |> redirect(to: page_path(conn, :index))
    end
  end

  def delete(conn, %{"id" => id}) do
    id = String.to_integer(id)

    case Play.cancel_game(id, conn.assigns.current_user) do
      :ok ->
        redirect(conn, to: page_path(conn, :index))

      {:error, _reason} ->
        conn
        |> put_flash(:danger, _reason)
        |> redirect(to: page_path(conn, :index))
    end
  end

  @timeout_seconds_whitelist [
    0,
    60,
    120,
    300,
    600,
    1200,
    3600
  ]

  @timeout_seconds_default 0

  defp timeout_seconds(%{"timeout_seconds" => timeout_seconds}) do
    timeout_seconds_int = cond do
      timeout_seconds == "" ->
        0
      timeout_seconds == nil ->
        0
      true ->
        String.to_integer(timeout_seconds)
    end

    if Enum.member?(@timeout_seconds_whitelist, timeout_seconds_int) do
      timeout_seconds_int
    else
      @timeout_seconds_default
    end
  end

  defp timeout_seconds(_) do
    @timeout_seconds_default
  end
end
