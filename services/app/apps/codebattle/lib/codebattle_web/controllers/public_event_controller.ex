defmodule CodebattleWeb.PublicEventController do
  use CodebattleWeb, :controller

  alias Codebattle.Event

  import PhoenixGon.Controller

  def show(conn, %{"slug" => slug}) do
    event = Event.get_by_slug!(slug)

    conn
    |> put_meta_tags(%{title: event.title})
    |> put_gon(
      event: %{
        event: event,
        top_leaderboard: [
          %{
            place: 1,
            score: 10,
            players_count: 100,
            clan_id: 1,
            clan_name: "Clan1"
          },
          %{
            place: 2,
            score: 9,
            players_count: 102,
            clan_id: 2,
            clan_name: "Clan2"
          },
          %{
            place: 3,
            score: 8,
            players_count: 104,
            clan_id: 3,
            clan_name: "Clan3"
          }
        ]
      }
    )
    |> render("show.html")
  end
end
