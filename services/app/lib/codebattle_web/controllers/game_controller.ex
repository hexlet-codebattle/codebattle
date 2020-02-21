defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller
  import CodebattleWeb.Gettext
  import PhoenixGon.Controller
  require Logger

  alias Codebattle.GameProcess.{Play, ActiveGames, FsmHelpers}
  alias Codebattle.Languages
  alias Codebattle.Bot.Playbook

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:create, :join])

  @timeout_seconds_default 3600
  @timeout_seconds_whitelist [0, 60, 120, 300, 600, 1200, 3600]

  action_fallback(CodebattleWeb.FallbackController)

  def create(conn, params) do
    type =
      case params["type"] do
        "withFriend" -> "private"
        "withRandomPlayer" -> "public"
        type -> type
      end

    game_params =
      params
      |> Map.take(["level"])
      |> Map.merge(%{
        "type" => type,
        "timeout_seconds" => get_timeout_seconds(params),
        "user" => conn.assigns.current_user
      })

    with {:ok, fsm} <- Play.create_game(game_params) do
      game_id = FsmHelpers.get_game_id(fsm)
      level = FsmHelpers.get_level(fsm)
      redirect(conn, to: game_path(conn, :show, game_id, level: level))
    end
  end

  def show(conn, %{"id" => id}) do
    case Play.get_fsm(id) do
      {:ok, fsm} ->
        task = FsmHelpers.get_task(fsm)
        langs = Languages.meta() |> Map.values() |> Languages.update_solutions(task)
        conn = put_gon(conn, game_id: id, langs: langs)
        is_participant = ActiveGames.participant?(id, conn.assigns.current_user.id)

        case {fsm.state, is_participant} do
          {:waiting_opponent, false} ->
            render(conn, "join.html", %{fsm: fsm})

          _ ->
            render(conn, "show.html", %{fsm: fsm, layout_template: "full_width.html"})
        end

      {:error, _reason} ->
        case Play.get_game(id) do
          nil ->
            conn
            |> put_status(:not_found)
            |> put_view(CodebattleWeb.ErrorView)
            |> render("404.html", %{msg: gettext("Game not found")})

          game ->
            if Playbook.exists?(id) do
              langs = Languages.meta() |> Map.values()

              conn
              |> put_gon(is_record: true, game_id: id, langs: langs)
              |> render("show.html", %{layout_template: "full_width.html"})
            else
              render(conn, "game_result.html", %{game: game})
            end
        end
    end
  end

  def join(conn, %{"id" => id}) do
    case Play.join_game(id, conn.assigns.current_user) do
      {:ok, _fsm} ->
        conn
        |> redirect(to: game_path(conn, :show, id))

      {:error, reason} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: page_path(conn, :index))
    end
  end

  def delete(conn, %{"id" => id}) do
    case Play.cancel_game(id, conn.assigns.current_user) do
      :ok ->
        redirect(conn, to: page_path(conn, :index))

      {:error, reason} ->
        conn
        |> put_flash(:danger, reason)
        |> redirect(to: page_path(conn, :index))
    end
  end

  defp get_timeout_seconds(%{"timeout_seconds" => timeout_seconds}) do
    timeout_seconds_int =
      case timeout_seconds do
        value when value in ["", nil] -> 0
        value -> String.to_integer(value)
      end

    if Enum.member?(@timeout_seconds_whitelist, timeout_seconds_int) do
      timeout_seconds_int
    else
      @timeout_seconds_default
    end
  end

  defp get_timeout_seconds(_), do: @timeout_seconds_default
end
