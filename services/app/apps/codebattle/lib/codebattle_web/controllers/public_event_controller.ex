defmodule CodebattleWeb.PublicEventController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Event
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserEvent

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:show, :stage])

  def show(conn, %{"slug" => slug}) do
    if event_allowed?(conn.assigns.current_user) do
      user = conn.assigns.current_user
      event = Event.get_by_slug!(slug)
      user_event = UserEvent.get_by_user_id_and_event_id(user.id, event.id)

      conn = put_meta_tags(conn, Application.get_all_env(:phoenix_meta_tags))

      conn
      |> assign(:ticker_text, event.ticker_text)
      |> assign(:show_header, true)
      |> put_gon(
        event: %{
          event: event,
          user_event: user_event
        }
      )
      |> render("show.html", layout: {CodebattleWeb.LayoutView, :external})
    else
      redirect(conn, to: Routes.root_path(conn, :index))
    end
  end

  def stage(conn, %{"slug" => slug, "stage_slug" => stage_slug}) do
    if event_allowed?(conn.assigns.current_user) do
      user = conn.assigns.current_user

      case Event.Context.start_stage_for_user(user, slug, stage_slug) do
        {:ok, %Tournament{} = tournament} ->
          redirect(conn, to: Routes.tournament_path(conn, :show, tournament.id))

        # {:ok, tournament_id} when is_integer(tournament_id) ->
        #   redirect(conn, to: Routes.tournament_path(conn, :show, tournament_id))

        {:error, error} ->
          Logger.error("Error starting stage: #{inspect(error)}")

          conn
          |> put_flash(:error, error)
          |> redirect(to: Routes.public_event_path(conn, :show, slug))
      end
    else
      redirect(conn, to: Routes.root_path(conn, :index))
    end
  end

  defp event_allowed?(user) do
    FunWithFlags.enabled?(:allow_event_page, for: user) or User.admin?(user)
  end
end
