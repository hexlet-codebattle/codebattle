defmodule CodebattleWeb.LiveViewEventController do
  use CodebattleWeb, :controller

  alias Codebattle.Event

  def show_leaderboard(conn, params) do
    current_user = conn.assigns[:current_user]
    event = Event.get!(params["id"])
    locale = Map.get(params, "locale", "en")

    leaderboard = [
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
      },
      %{
        place: 4,
        score: 7,
        players_count: 104,
        clan_id: 4,
        clan_name: "Clan4"
      },
      %{
        place: 5,
        score: 6,
        players_count: 104,
        clan_id: 5,
        clan_name: "Clan5"
      },
      %{
        place: 6,
        score: 5,
        players_count: 104,
        clan_id: 6,
        clan_name: "Clan6"
      },
      %{
        place: 7,
        score: 4,
        players_count: 104,
        clan_id: 7,
        clan_name: "Clan7"
      },
      %{
        place: 8,
        score: 3,
        players_count: 104,
        clan_id: 8,
        clan_name: "Clan8"
      },
      %{
        place: 9,
        score: 2,
        players_count: 104,
        clan_id: 9,
        clan_name: "Clan9"
      },
      %{
        place: 10,
        score: 1,
        players_count: 104,
        clan_id: 10,
        clan_name: "Clan10"
      }
    ]

    conn
    |> put_meta_tags(%{
      title: "#{event.title} • Hexlet Codebattle",
      description: "Event: #{event.title}",
      url: Routes.event_leaderboard_url(conn, :show_leaderboard, event.id)
    })
    |> live_render(CodebattleWeb.Live.Event.LeaderboardView,
      session: %{"current_user" => current_user, "leaderboard" => leaderboard, "locale" => locale},
      layout: {CodebattleWeb.LayoutView, "empty.html"}
    )
  end
end
