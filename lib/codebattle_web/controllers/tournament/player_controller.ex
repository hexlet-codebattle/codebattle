defmodule CodebattleWeb.Tournament.PlayerController do
  use CodebattleWeb, :controller

  alias Codebattle.Runner.Languages
  alias Codebattle.Tournament
  alias Codebattle.User
  alias CodebattleWeb.Frontend

  def show(conn, params) do
    user = User.get!(params["player_id"])

    tournament = Tournament.Context.get!(params["id"])

    conn
    |> put_meta_tags(%{
      title: "#{user.name} Live",
      description: "#{String.slice(tournament.name, 0, 100)}",
      url: Routes.tournament_player_url(conn, :show, tournament.id, params["player_id"])
    })
    |> Frontend.put_layout()
    |> render_inertia("TournamentPlayer", %{
      "tournament_id" => String.to_integer(params["id"]),
      "player_id" => String.to_integer(params["player_id"]),
      "player_name" => user.name,
      "cancel_redirect_to_new_game" => true,
      "langs" => Languages.get_langs()
    })
  end
end
