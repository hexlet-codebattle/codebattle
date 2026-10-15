defmodule CodebattleWeb.GameController do
  use CodebattleWeb, :controller

  alias Codebattle.Game
  alias Codebattle.Game.BotDetection
  alias Codebattle.Game.Context
  alias Codebattle.Game.Helpers
  alias Codebattle.Playbook
  alias Codebattle.Repo
  alias Codebattle.Task
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserGameReport
  alias CodebattleWeb.Api.GameView
  alias CodebattleWeb.Frontend

  require Logger

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:join, :delete, :create_by_task])
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  action_fallback(CodebattleWeb.FallbackController)

  def show(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Context.fetch_game(id) do
      {:ok, game} ->
        if can_access_game?(game, user) do
          show_game(game, user, conn)
        else
          conn
          |> put_flash(:danger, gettext("You don't have access to this game"))
          |> redirect(to: Routes.root_path(conn, :index))
        end

      {:error, :not_found} ->
        render_game_not_found(conn)
    end
  end

  # The broadcast screen of a game.
  def stream(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Context.fetch_game(id) do
      {:ok, game} ->
        if can_access_game?(game, user) do
          head_to_head = Context.fetch_head_to_head(game)
          game = ensure_task_loaded(game)
          game_params = GameView.render_game(game, head_to_head)

          conn
          |> put_game_meta_tags(game)
          |> Frontend.put_layout()
          |> render_inertia("GameStream", %{
            "game" => game_params,
            "game_id" => game.id,
            "players" => present_users(Helpers.get_players(game))
          })
        else
          conn
          |> put_flash(:danger, gettext("You don't have access to this game"))
          |> redirect(to: Routes.root_path(conn, :index))
        end

      {:error, :not_found} ->
        render_game_not_found(conn)
    end
  end

  # The bot-detection report, like the history: for everyone who can see the game once it is
  # over (it shows both players' code), for admins and moderators also during play.
  def ml(conn, %{"id" => id} = params) do
    user = conn.assigns.current_user

    case Context.fetch_game(id) do
      {:ok, game} ->
        cond do
          User.admin_or_moderator?(user) -> render_ml_for_game(conn, game, user, params)
          not can_access_game?(game, user) -> render_ml_forbidden(conn, gettext("You don't have access to this game"))
          game.state in ["game_over", "timeout"] -> render_ml_for_game(conn, game, user, params)
          true -> render_ml_forbidden(conn, gettext("The report opens once the game is over"), game)
        end

      {:error, :not_found} ->
        render_game_not_found(conn)
    end
  end

  defp render_ml_for_game(conn, game, user, params) do
    can_manage = User.admin_or_moderator?(user)

    # Re-analyzing is CPU-heavy: admins and moderators only.
    if can_manage and Map.get(params, "refresh") == "1" do
      {:ok, _} = BotDetection.analyze_and_persist(game.id)
    end

    batches = Codebattle.Game.EditorEventBatch.list_by_game(game.id)
    {:ok, analyses} = BotDetection.get_or_analyze(game.id)
    analyses_by_user = Map.new(analyses, &{&1.user_id, &1})
    players = Helpers.get_players(game)

    conn
    |> Frontend.put_layout()
    |> render_inertia("GameMl", %{
      "game_id" => game.id,
      "can_manage" => can_manage,
      "players" => Enum.map(players, &serialize_ml_player(&1, analyses_by_user)),
      "batches" => Enum.map(batches, &serialize_batch/1)
    })
  end

  defp render_ml_forbidden(conn, message, game \\ nil) do
    conn
    |> put_flash(:danger, message)
    |> redirect(to: if(game, do: Routes.game_path(conn, :show, game.id), else: Routes.root_path(conn, :index)))
  end

  defp serialize_ml_player(player, analyses_by_user) do
    analysis = Map.get(analyses_by_user, player.id)

    %{
      id: player.id,
      name: player.name,
      avatar_url: Map.get(player, :avatar_url),
      rating: Map.get(player, :rating),
      rank: Map.get(player, :rank),
      lang: Map.get(player, :editor_lang) || Map.get(player, :lang),
      is_bot: Map.get(player, :is_bot, false),
      editor_text: Map.get(player, :editor_text),
      editor_lang: Map.get(player, :editor_lang),
      report: serialize_analysis(analysis)
    }
  end

  defp serialize_analysis(nil), do: nil

  defp serialize_analysis(%BotDetection.Analysis{} = a) do
    %{
      score: a.score,
      level: Atom.to_string(a.level),
      signals: a.signals,
      stats: a.stats,
      code_analysis: a.code_analysis,
      final_length: a.final_length,
      template_length: a.template_length,
      effective_added_length: a.effective_added_length
    }
  end

  defp serialize_batch(batch) do
    %{
      id: batch.id,
      user_id: batch.user_id,
      lang: batch.lang,
      event_count: batch.event_count,
      window_start_offset_ms: batch.window_start_offset_ms,
      window_end_offset_ms: batch.window_end_offset_ms,
      batch_started_at: batch.batch_started_at,
      batch_ended_at: batch.batch_ended_at,
      summary: batch.summary,
      inserted_at: batch.inserted_at
    }
  end

  # A form post from the waiting room or the lobby. When joining is not possible the user lands
  # where the reason makes sense (the game itself, or the game that blocks them) with a toast,
  # instead of the lobby with no explanation.
  def join(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    with {:ok, game} <- Context.fetch_game(id),
         :ok <- check_joinable(game),
         {:ok, _game} <- Context.join_game(game.id, user) do
      redirect(conn, to: Routes.game_path(conn, :show, game.id))
    else
      {:error, :not_found} ->
        render_game_not_found(conn)

      {:error, :not_waiting_opponent} ->
        conn
        |> put_flash(:warning, gettext("This game has already started. You can watch it."))
        |> redirect(to: Routes.game_path(conn, :show, id))

      {:error, :already_in_a_game} ->
        redirect_to_blocking_game(conn, id, Game.Auth.active_game_id(user.id))

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp check_joinable(%{state: "waiting_opponent"}), do: :ok
  defp check_joinable(_game), do: {:error, :not_waiting_opponent}

  defp redirect_to_blocking_game(conn, id, active_id) do
    if active_id && to_string(active_id) == to_string(id) do
      conn
      |> put_flash(:info, gettext("You are already in this game."))
      |> redirect(to: Routes.game_path(conn, :show, id))
    else
      conn
      |> put_flash(
        :warning,
        gettext("You are already in another game. Finish or cancel it before joining a new one.")
      )
      |> redirect(to: if(active_id, do: Routes.game_path(conn, :show, active_id), else: Routes.root_path(conn, :index)))
    end
  end

  def delete(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Context.cancel_game(id, user) do
      :ok -> redirect(conn, to: Routes.root_path(conn, :index))
      {:error, reason} -> {:error, reason}
    end
  end

  def create_training(conn, _params) do
    task = Task.get_random_training_task()

    game_params = %{
      level: "elementary",
      task: task,
      mode: "training",
      use_chat: false,
      visibility_type: "hidden",
      players: [conn.assigns.current_user, Codebattle.Bot.Context.build()]
    }

    case Context.create_game(game_params) do
      {:ok, game} -> redirect(conn, to: Routes.game_path(conn, :show, game.id))
      {:error, reason} -> {:error, reason}
    end
  end

  def create_by_task(conn, %{"task_id" => task_id}) do
    case get_visible_task(conn.assigns.current_user, task_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "NOT_FOUND"})

      task ->
        create_game_by_task(conn, task)
    end
  end

  defp get_visible_task(user, task_id) do
    case Integer.parse(to_string(task_id)) do
      {id, ""} -> Task.get_task_by_id_for_user(user, id)
      _ -> nil
    end
  end

  defp create_game_by_task(conn, task) do
    game_params = %{
      level: task.level,
      task: task,
      mode: "standard",
      use_chat: true,
      visibility_type: "hidden",
      players: [conn.assigns.current_user, Codebattle.Bot.Context.build()]
    }

    case Context.create_game(game_params) do
      {:ok, game} ->
        json(conn, %{game_id: game.id})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: reason})
    end
  end

  # One full-screen page for every game: live (any state, also
  # for spectators of a waiting game, who get a Join screen) and finished (history).
  # `?history=1` replays a live game from its in-memory playbook: once it is over for
  # everyone, and while it is still played for admins/moderators (checking for cheaters).
  defp show_game(%Game{is_live: true} = game, user, conn) do
    if conn.params["history"] == "1" and live_history_allowed?(game, user) do
      render_history(conn, game, user, has_playbook: true, live: true)
    else
      conn
      |> put_game_meta_tags(game)
      |> Frontend.put_layout()
      |> render_inertia("GameRoom", live_game_props(game, user))
    end
  end

  defp show_game(game, user, conn) do
    render_history(conn, game, user, has_playbook: Playbook.Context.exists?(game.id), live: false)
  end

  defp live_history_allowed?(game, user), do: game.state in ["game_over", "timeout"] or User.admin_or_moderator?(user)

  defp render_history(conn, game, user, opts) do
    game = ensure_task_loaded(game)
    head_to_head = Context.fetch_head_to_head(game)

    conn
    |> put_game_meta_tags(game)
    |> Frontend.put_layout()
    |> render_inertia("GameRoom", %{
      "is_record" => true,
      "has_playbook" => opts[:has_playbook],
      # The game still runs: the page offers the way back to it.
      "is_live" => opts[:live],
      "can_manage_game" => User.admin_or_moderator?(user),
      "game_id" => game.id,
      "game" => game |> GameView.render_game(head_to_head) |> Map.put(:mode, "history"),
      "tournament_id" => game.tournament_id,
      "tournament_name" => tournament_name(game),
      "players" => present_users(Helpers.get_players(game))
    })
  end

  defp live_game_props(game, user) do
    # Games started without their task in memory (an older tournament bug) still show it.
    game = ensure_task_loaded(game)
    head_to_head = Context.fetch_head_to_head(game)

    %{
      "reports" => maybe_get_reports(user, game.id),
      "editor_summary_enabled" => !FunWithFlags.enabled?(:editor_summary_disabled),
      "can_manage_game" => User.admin_or_moderator?(user),
      "game" =>
        game
        |> GameView.render_game(head_to_head)
        |> maybe_put_tournament_player_restrictions(game, user),
      "game_id" => game.id,
      "tournament_id" => Helpers.get_tournament_id(game),
      "tournament_name" => tournament_name(game),
      "players" => present_users(Helpers.get_players(game))
    }
  end

  # Tournament games title the browser tab with the tournament.
  defp tournament_name(%{tournament_id: nil}), do: nil

  defp tournament_name(%{tournament_id: tournament_id}) do
    case Tournament.Context.get_info(tournament_id) do
      %{name: name} -> name
      _ -> nil
    end
  end

  defp present_users(users) do
    Enum.map(
      users,
      &Map.take(&1, [
        :id,
        :is_guest,
        :is_bot,
        :rating,
        :rank,
        :lang,
        :name,
        :avatar_url
      ])
    )
  end

  defp can_access_game?(game, user) do
    if User.admin_or_moderator?(user) do
      true
    else
      if FunWithFlags.enabled?(:user_only_see_own_games) do
        Enum.any?(game.players, &(&1.id == user.id))
      else
        true
      end
    end
  end

  defp ensure_task_loaded(%{task: %Task{}} = game), do: game

  defp ensure_task_loaded(game) do
    task_id = Map.get(game, :task_id)

    if is_integer(task_id) do
      case Repo.get(Task, task_id) do
        nil -> reload_task_from_db(game)
        task -> %{game | task: task}
      end
    else
      reload_task_from_db(game)
    end
  end

  defp reload_task_from_db(%{id: id} = game) when is_integer(id) do
    import Ecto.Query

    query = from(g in Game, where: g.id == ^id, preload: [:task], select: g.task)

    case Repo.one(query) do
      %Task{} = task -> %{game | task: task}
      _ -> game
    end
  end

  defp reload_task_from_db(game), do: game

  defp maybe_get_reports(user, game_id) do
    if User.admin_or_moderator?(user) do
      UserGameReport.list_by_game(game_id)
    else
      []
    end
  end

  defp put_game_meta_tags(conn, game) do
    put_meta_tags(conn, %{
      title: game_meta_title(game) <> " · Codebattle",
      description: game_meta_description(game),
      url: Routes.game_url(conn, :show, game.id, level: Helpers.get_level(game)),
      image: Routes.game_image_url(conn, :show, game.id),
      twitter: get_twitter_labels_meta(game.players)
    })
  end

  defp render_game_not_found(conn) do
    conn
    |> put_status(:not_found)
    |> put_view(CodebattleWeb.ErrorView)
    |> render("404.html", %{msg: gettext("Game not found")})
  end

  defp get_twitter_labels_meta(players) do
    players
    |> Enum.with_index(1)
    |> Enum.reduce(%{}, fn
      {nil, _i}, acc ->
        acc

      {player, i}, acc ->
        label = player.name
        data = "#{player.rating} - #{player.lang}"

        acc |> Map.put("label#{i}", label) |> Map.put("data#{i}", data)
    end)
  end

  defp maybe_put_tournament_player_restrictions(game_params, %{tournament_id: nil}, _user),
    do: Map.put(game_params, :hide_banned_player_controls, true)

  defp maybe_put_tournament_player_restrictions(game_params, game, _user) do
    tournament = Tournament.Context.get_info(game.tournament_id)

    Map.put(
      game_params,
      :hide_banned_player_controls,
      !!(tournament && tournament.exclude_banned_players)
    )
  end

  defp game_meta_title(%{state: "waiting_opponent", players: [player | _]}),
    do: "⚔️ " <> gettext("%{name} is looking for an opponent", name: player.name)

  defp game_meta_title(%{state: "playing", players: [player1, player2 | _]}),
    do: "🔴 " <> gettext("%{first} vs %{second}: live", first: player1.name, second: player2.name)

  defp game_meta_title(%{state: "game_over", players: [_, _ | _] = players} = game) do
    case Enum.split_with(players, &(&1.result == "won")) do
      {[winner | _], [loser | _]} ->
        "🏆 " <> gettext("%{winner} beat %{loser}", winner: winner.name, loser: loser.name)

      _ ->
        versus_title(game)
    end
  end

  defp game_meta_title(%{players: [_, _ | _]} = game), do: versus_title(game)
  defp game_meta_title(_game), do: gettext("Coding battle")

  defp versus_title(%{players: [player1, player2 | _]}),
    do: gettext("%{first} vs %{second}", first: player1.name, second: player2.name)

  defp game_meta_description(%{state: "waiting_opponent", players: [player | _]} = game) do
    gettext("%{name} (%{player}) is waiting for an opponent. Take the free seat and solve the task first!",
      name: player.name,
      player: player_meta(player)
    ) <> game_meta_details(game)
  end

  defp game_meta_description(%{state: "playing", players: [player1, player2 | _]} = game) do
    gettext("%{first} (%{first_meta}) and %{second} (%{second_meta}) are solving the same task right now. Watch live!",
      first: player1.name,
      first_meta: player_meta(player1),
      second: player2.name,
      second_meta: player_meta(player2)
    ) <> game_meta_details(game)
  end

  defp game_meta_description(%{state: "game_over", players: players} = game) do
    case Enum.find(players, &(&1.result == "won")) do
      nil ->
        gettext("The battle is over. Think you can solve it faster? Play on Codebattle.") <> game_meta_details(game)

      winner ->
        gettext("%{name} solved the task first in %{lang}. Think you can do better? Play on Codebattle.",
          name: winner.name,
          lang: winner.lang
        ) <> game_meta_details(game)
    end
  end

  defp game_meta_description(%{state: "timeout"} = game) do
    gettext("Time ran out before anyone solved the task. Think you can? Play on Codebattle.") <>
      game_meta_details(game)
  end

  defp game_meta_description(game) do
    gettext("A head-to-head coding battle on Codebattle.") <> game_meta_details(game)
  end

  defp player_meta(%{rating: rating, lang: lang}) when is_integer(rating), do: "#{rating} · #{lang}"
  defp player_meta(%{lang: lang}), do: lang

  # " Elementary · 8 min"
  defp game_meta_details(game) do
    level = if game.level, do: Gettext.gettext(CodebattleWeb.Gettext, String.capitalize(game.level))
    minutes = if game.timeout_seconds, do: gettext("%{count} min", count: div(game.timeout_seconds, 60))

    case Enum.reject([level, minutes], &is_nil/1) do
      [] -> ""
      parts -> " " <> Enum.join(parts, " · ")
    end
  end
end
