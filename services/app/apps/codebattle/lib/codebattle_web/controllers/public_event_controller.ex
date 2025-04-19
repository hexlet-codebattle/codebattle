defmodule CodebattleWeb.PublicEventController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Event
  alias Codebattle.UserEvent

  def show(conn, %{"slug" => slug}) do
    user = conn.assigns.current_user
    event = Event.get_by_slug!(slug)
    user_event = UserEvent.get_by_user_id_and_event_id(user.id, event.id)

    conn = put_meta_tags(conn, Application.get_all_env(:phoenix_meta_tags))

    conn
    |> assign(:ticker_text, event.ticker_text)
    |> put_gon(
      event: %{
        event: event,
        user_event: user_event
      }
    )
    |> render("show.html")
  end
end
