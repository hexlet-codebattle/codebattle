defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament

  def index(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Tournaments",
      description:
        "Create or join nice tournaments, have fun with your teammates! You can play `Frontend vs Backend` or `Ruby vs Js`",
      url: Routes.tournament_url(conn, :index)
    })
    |> live_render(CodebattleWeb.Live.Tournament.IndexView,
      session: %{
        "current_user" => conn.assigns[:current_user],
        "tournaments" => Tournament.Context.list_live_and_finished()
      }
    )
  end

  def show(conn, params) do
    tournament = Tournament.Context.get!(params["id"])

    conn
    |> put_meta_tags(%{
      title: "#{tournament.name} • Hexlet Codebattle",
      description: "Join tournament: #{String.slice(tournament.name, 0, 100)}, type: #{tournament.type}, starts_at: #{tournament.starts_at}",
      image: Routes.tournament_image_url(conn, :show, tournament.id),
      url: Routes.tournament_url(conn, :show, tournament.id)
    })
    |> live_render(CodebattleWeb.Live.Tournament.ShowView,
      session: %{"current_user" => conn.assigns[:current_user], "tournament" => tournament}
    )
  end
end
