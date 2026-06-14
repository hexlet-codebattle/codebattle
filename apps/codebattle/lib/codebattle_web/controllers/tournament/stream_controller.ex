defmodule CodebattleWeb.Tournament.StreamController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias CodebattleWeb.Api.GameView
  alias CodebattleWeb.TournamentAdminChannel

  def show(conn, params) do
    tournament = Tournament.Context.get!(params["id"])

    if Helpers.can_moderate?(tournament, conn.assigns.current_user) do
      tournament_id = String.to_integer(params["id"])
      {game_id, game_params} = fetch_active_game(tournament)

      conn
      |> put_view(CodebattleWeb.TournamentView)
      |> put_layout(html: {CodebattleWeb.LayoutView, :empty})
      |> put_meta_tags(%{title: "Stream Tournament"})
      |> put_gon(
        tournament_id: tournament_id,
        game_id: game_id,
        game: game_params
      )
      |> render("threejs_stream.html")
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end

  def json_state(conn, params) do
    tournament = Tournament.Context.get!(params["id"])
    current_user = conn.assigns[:current_user]

    if Helpers.can_moderate?(tournament, current_user) do
      clans = if tournament.use_clan, do: Tournament.Clans.get_all(tournament), else: %{}
      matches = try_get_matches(tournament)
      players = Helpers.get_players(tournament)
      active_game_id = TournamentAdminChannel.get_active_game(tournament.id)

      json(conn, %{
        tournament: Helpers.prepare_to_json(tournament),
        active_game_id: active_game_id,
        matches: matches,
        players: players,
        clans: clans,
        ranking: Tournament.Ranking.get_page(tournament, 1, 200)
      })
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end

  defp try_get_matches(tournament) do
    Helpers.get_matches(tournament)
  rescue
    _ -> []
  end

  def admin(conn, params) do
    tournament = Tournament.Context.get!(params["id"])
    current_user = conn.assigns[:current_user]

    if Helpers.can_moderate?(tournament, current_user) do
      conn
      |> put_meta_tags(%{title: "Stream Admin"})
      |> Phoenix.LiveView.Controller.live_render(
        CodebattleWeb.Live.Admin.TournamentStreamView,
        session: %{"current_user" => current_user, "tournament" => tournament}
      )
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end

  defp fetch_active_game(tournament) do
    matches =
      try do
        Helpers.get_matches(tournament, "playing")
      rescue
        _ -> []
      end

    active = List.first(matches)

    case active do
      %{game_id: game_id} when is_integer(game_id) ->
        case Game.Context.fetch_game(game_id) do
          {:ok, game} ->
            head_to_head = Game.Context.fetch_head_to_head_by_game_id(game.id)
            {game_id, GameView.render_game(game, head_to_head)}

          _ ->
            {nil, nil}
        end

      _ ->
        {nil, nil}
    end
  end
end
