defmodule CodebattleWeb.PublicEventController do
  use CodebattleWeb, :controller

  alias Codebattle.Event

  def show(conn, %{"slug" => slug}) do
    event = Event.get_by_slug!(slug)

    conn
    |> put_meta_tags(%{title: event.title})
    |> render("show.html", %{event: event, user: conn.assigns.current_user})
  end
end
