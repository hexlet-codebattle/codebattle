defmodule CodebattleWeb.Tournament.StreamController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.TournamentResult
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
      json(conn, build_json_state(tournament))
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end

  defp build_json_state(tournament) do
    players = safe_get_players(tournament)
    user_history = safe_get_users_history(tournament, players)
    max_draw_index = Helpers.get_max_draw_index(players)
    win_probs = compute_win_probs(user_history)

    %{
      tournament_id: tournament.id,
      current_round: current_round(tournament),
      players: serialize_players(players, user_history, win_probs, max_draw_index),
      clans: serialize_clans(tournament),
      active_game_id: TournamentAdminChannel.get_active_game(tournament.id)
    }
  end

  defp current_round(%{state: "waiting_participants"}), do: 0
  defp current_round(%{current_round_position: pos}), do: (pos || 0) + 1

  defp serialize_players(players, user_history, win_probs, max_draw_index) do
    players
    |> Enum.sort_by(&{-(&1.score || 0), &1.place || 99_999, &1.id})
    |> Enum.map(&serialize_player(&1, user_history, win_probs, max_draw_index))
  end

  defp serialize_player(player, user_history, win_probs, max_draw_index) do
    %{
      id: to_string(player.id),
      name: player.name,
      clan_id: player.clan_id && to_string(player.clan_id),
      total_score: player.score || 0,
      total_tasks: length(player.matches_ids || []),
      won_tasks: player.wins_count || 0,
      rank: player.rank,
      win_prob: to_string(win_probs[player.id] || ""),
      active: if(player.draw_index == max_draw_index, do: 1, else: 0),
      history: user_history[player.id] || []
    }
  end

  defp serialize_clans(%{use_clan: true} = tournament), do: format_clans(Tournament.Clans.get_all(tournament))

  defp serialize_clans(_tournament), do: %{}

  defp safe_get_players(tournament) do
    Helpers.get_players(tournament)
  rescue
    _ -> []
  end

  defp safe_get_users_history(tournament, players) do
    TournamentResult.get_users_history(tournament, Enum.map(players, & &1.id))
  rescue
    _ -> %{}
  end

  # Win probability = each top-8 player's share of the top-8 total history score.
  # Score for each player is summed from their full history. Players outside the
  # top 8 get no win_prob.
  defp compute_win_probs(user_history) do
    totals =
      Map.new(user_history, fn {user_id, rounds} ->
        {user_id, Enum.sum(Enum.map(rounds, &(&1.score || 0)))}
      end)

    top_8 =
      totals
      |> Enum.sort_by(fn {_id, score} -> -score end)
      |> Enum.take(8)

    top_8_total = top_8 |> Enum.map(fn {_id, s} -> s end) |> Enum.sum()

    if top_8_total > 0 do
      Map.new(top_8, fn {id, score} -> {id, round(score * 100.0 / top_8_total)} end)
    else
      %{}
    end
  end

  defp format_clans(clans) do
    Map.new(clans, fn {id, clan} ->
      {to_string(id), %{name: clan[:name], long_name: clan[:long_name]}}
    end)
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
