defmodule CodebattleWeb.PublicEventController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Event
  alias Codebattle.Tournament

  def show(conn, %{"slug" => slug}) do
    event = Event.get_by_slug!(slug)
    tournaments = Tournament.Context.get_all_by_event_id!(event.id)

    conn
    |> put_meta_tags(%{title: event.title, description: event.description})
    |> assign(:ticker_text, event.ticker_text)
    |> put_gon(
      event: %{
        event: event,
        tournaments: tournaments,
        top_leaderboard: []
      }
    )
    |> render("show.html")
  end
end
