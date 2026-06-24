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
      |> assign(:body_class, "cb-stream-transparent-page")
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

    if Helpers.can_moderate?(tournament, current_user) or valid_api_token?(conn) do
      json(conn, build_json_state(tournament))
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end

  # Mirrors `CodebattleWeb.Plugs.TokenAuth`: accept `x-auth-key` header or
  # `auth-key` / `auth_token` query params. Configured key in :codebattle, :api_key.
  defp valid_api_token?(conn) do
    expected = Application.get_env(:codebattle, :api_key)
    provided = extract_api_token(conn)
    is_binary(expected) and expected != "" and expected == provided
  end

  defp extract_api_token(conn) do
    case Plug.Conn.get_req_header(conn, "x-auth-key") do
      [header_key | _] -> header_key
      _ -> conn.params["auth-key"] || conn.params["auth_token"]
    end
  end

  # Funnel of how many top players stay "active" after each completed round.
  @active_cutoffs %{1 => 128, 2 => 64, 3 => 32, 4 => 16, 5 => 8, 6 => 4, 7 => 2, 8 => 1}

  # Public so the stream-state shape (active/rank funnel) can be unit-tested with an
  # inline tournament struct without spinning up a tournament server.
  def build_json_state(tournament) do
    players = safe_get_players(tournament)
    user_history = safe_get_users_history(tournament, players)
    active_ids = active_player_ids(tournament, players)
    win_probs = compute_win_probs(tournament, user_history, active_ids)

    %{
      tournament_id: tournament.id,
      current_round: current_round(tournament),
      players: serialize_players(players, user_history, win_probs, active_ids),
      clans: serialize_clans(tournament),
      active_game_id: TournamentAdminChannel.get_active_game(tournament.id)
    }
  end

  defp current_round(%{state: "waiting_participants"}), do: 0
  defp current_round(%{current_round_position: pos}), do: (pos || 0) + 1

  # How many rounds have fully finished. During a round's break the just-played
  # round already counts as complete; once the tournament is finished all do.
  defp completed_rounds(%{state: "finished", rounds_limit: limit}) when is_integer(limit), do: limit
  defp completed_rounds(%{break_state: "on", current_round_position: pos}), do: (pos || 0) + 1
  defp completed_rounds(%{current_round_position: pos}), do: pos || 0

  # Set of player ids still "active" in the funnel.
  #   - top200 play-off phase (last 3 rounds, 4→2→1): bracket survivors — the
  #     deepest draw_index wave (top200 bumps draw_index for each pair's winner).
  #   - otherwise (Swiss phase / other types): top-N by place per the cutoff table.
  defp active_player_ids(%{type: "top200"} = tournament, players) do
    if completed_rounds(tournament) >= 6 do
      bracket_survivor_ids(players)
    else
      cutoff_player_ids(players, completed_rounds(tournament))
    end
  end

  defp active_player_ids(tournament, players) do
    cutoff_player_ids(players, completed_rounds(tournament))
  end

  defp cutoff_player_ids(players, completed) do
    case active_cutoff(completed) do
      :infinity ->
        MapSet.new(players, & &1.id)

      cutoff ->
        players
        |> Enum.filter(&(is_integer(&1.place) and &1.place >= 1 and &1.place <= cutoff))
        |> MapSet.new(& &1.id)
    end
  end

  defp bracket_survivor_ids(players) do
    max_draw_index = players |> Enum.map(&(&1.draw_index || 0)) |> Enum.max(fn -> 0 end)

    players
    |> Enum.filter(&((&1.draw_index || 0) == max_draw_index))
    |> MapSet.new(& &1.id)
  end

  # No round finished yet → everyone is still active; otherwise top-N by place.
  defp active_cutoff(0), do: :infinity
  defp active_cutoff(n), do: Map.get(@active_cutoffs, n, 1)

  defp serialize_players(players, user_history, win_probs, active_ids) do
    players
    |> Enum.sort_by(&{-(&1.score || 0), &1.place || 99_999, &1.id})
    |> Enum.map(&serialize_player(&1, user_history, win_probs, active_ids))
  end

  defp serialize_player(player, user_history, win_probs, active_ids) do
    %{
      id: to_string(player.id),
      name: player.name,
      clan_id: player.clan_id && to_string(player.clan_id),
      total_score: player.score || 0,
      total_tasks: length(player.matches_ids || []),
      won_tasks: player.wins_count || 0,
      rank: player.place,
      win_prob: to_string(win_probs[player.id] || ""),
      active: MapSet.member?(active_ids, player.id),
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

  # Win probability for the players still contending for 1st place: each remaining
  # main-net player's share of that pool's total history score (summed from their
  # full history).
  #
  # The pool is the bracket "active" set (same funnel as the `active` flag), which
  # narrows by draw_index as the playoff progresses:
  #   * Swiss done / QF in progress → the top-8 entering the quarterfinals
  #   * after QF → 4 main-net survivors, after SF → 2 finalists, then the champion
  #
  # Only shown in the playoff phase (top200, >=5 completed rounds); blank during the
  # Swiss stage and for non-bracket tournaments. Players outside the pool get no
  # win_prob.
  defp compute_win_probs(tournament, user_history, active_ids) do
    if win_prob_phase?(tournament) do
      user_history
      |> active_history_totals(active_ids)
      |> normalize_win_probs()
    else
      %{}
    end
  end

  defp active_history_totals(user_history, active_ids) do
    user_history
    |> Enum.filter(fn {user_id, _rounds} -> MapSet.member?(active_ids, user_id) end)
    |> Map.new(fn {user_id, rounds} ->
      {user_id, Enum.sum(Enum.map(rounds, &(&1.score || 0)))}
    end)
  end

  defp normalize_win_probs(totals) do
    total = totals |> Map.values() |> Enum.sum()

    if total > 0 do
      Map.new(totals, fn {id, score} -> {id, round(score * 100.0 / total)} end)
    else
      %{}
    end
  end

  # Win probabilities are a playoff-bracket concept: only meaningful once the Swiss
  # stage is over and the top-8 bracket is set (top200, >=5 completed rounds). The
  # active set is driven by draw_index from the quarterfinals onward.
  defp win_prob_phase?(%{type: "top200"} = tournament), do: completed_rounds(tournament) >= 5
  defp win_prob_phase?(_tournament), do: false

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

  # Seed the initial game from the admin-selected active game if one is stored,
  # otherwise fall back to the first currently-playing match. Without this, a page
  # reload (e.g. tweaking font_size in an OBS source URL) renders with no game_id
  # and flashes the "Waiting..." placeholder until the stream channel round-trips
  # back the active game id.
  defp fetch_active_game(tournament) do
    case active_game_id(tournament) do
      game_id when is_integer(game_id) ->
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

  defp active_game_id(tournament) do
    case TournamentAdminChannel.get_active_game(tournament.id) do
      game_id when is_integer(game_id) -> game_id
      _ -> first_playing_game_id(tournament)
    end
  end

  defp first_playing_game_id(tournament) do
    matches =
      try do
        Helpers.get_matches(tournament, "playing")
      rescue
        _ -> []
      end

    case List.first(matches) do
      %{game_id: game_id} when is_integer(game_id) -> game_id
      _ -> nil
    end
  end
end
