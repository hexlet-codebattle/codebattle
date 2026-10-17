defmodule CodebattleWeb.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.Season
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Ranking
  alias Codebattle.User
  alias CodebattleWeb.LinkPreview
  alias CodebattleWeb.OgImage
  alias CodebattleWeb.Plugs.RequireAuth

  plug(:link_preview when action == :show)
  # Guests see :show as a public preview with sign-up calls instead of the login redirect.
  plug(RequireAuth when action in [:index, :edit])
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, _params) do
    current_user = conn.assigns[:current_user]

    user_timezone = get_in(conn.private, [:connect_params, "timezone"]) || "UTC"

    task_pack_names =
      current_user
      |> Codebattle.TaskPack.list_visible()
      |> Enum.map(& &1.name)

    last_tournament =
      current_user
      |> Tournament.Context.get_last_created_tournament()
      |> last_tournament_json()

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Tournaments",
      description:
        "Create or join nice tournaments, have fun with your teammates! You can play `Frontend vs Backend` or `Ruby vs Js`",
      url: Routes.tournament_url(conn, :index)
    })
    |> assign(:page_title, "Tournaments")
    |> CodebattleWeb.Frontend.put_layout()
    |> render_inertia("TournamentIndex", %{
      "page_title" => "Tournaments",
      "last_tournament" => last_tournament,
      "task_pack_names" => task_pack_names,
      "user_timezone" => user_timezone
    })
  end

  def show(conn, params) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(params["id"])

    can_access? = Helpers.can_access?(tournament, current_user, params)

    cond do
      current_user.is_guest and can_access? ->
        render_public_tournament(conn, tournament)

      # A private tournament without its token: maybe the guest is a player, let them sign in.
      current_user.is_guest ->
        RequireAuth.call(conn, [])

      can_access? ->
        handle_tournament_for_user(conn, tournament, current_user, params)

      true ->
        conn
        |> put_status(:not_found)
        |> put_view(CodebattleWeb.ErrorView)
        |> render("404.html", %{msg: gettext("Tournament not found")})
    end
  end

  def edit(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]
    tournament = Tournament.Context.get!(id)

    # Check if user has permission to edit
    if Helpers.can_moderate?(tournament, current_user) do
      user_timezone = get_in(conn.private, [:connect_params, "timezone"]) || "UTC"

      task_pack_names =
        current_user
        |> Codebattle.TaskPack.list_visible()
        |> Enum.map(& &1.name)

      conn
      |> put_meta_tags(%{
        title: "Edit #{tournament.name}",
        description: "Edit tournament settings"
      })
      |> assign(:page_title, "Edit #{tournament.name}")
      |> CodebattleWeb.Frontend.put_layout()
      |> render_inertia("TournamentEdit", %{
        "page_title" => "Edit #{tournament.name}",
        "tournament_id" => tournament.id,
        # The new frontend fills the form from this instead of fetching the tournament.
        "tournament" => edit_tournament_json(tournament),
        "task_pack_names" => task_pack_names,
        "user_timezone" => user_timezone
      })
    else
      conn
      |> put_flash(:error, gettext("You don't have permission to edit this tournament"))
      |> redirect(to: Routes.tournament_path(conn, :show, id))
    end
  end

  defp handle_tournament_for_user(conn, tournament, current_user, params) do
    auto_redirect =
      tournament.auto_redirect_to_game ||
        FunWithFlags.enabled?(:tournament_redirect_to_latest_game)

    if auto_redirect and !User.admin_or_moderator?(current_user),
      do: maybe_redirect_tournament(conn, tournament, current_user, params),
      else: render_tournament(conn, tournament, params)
  end

  defp maybe_redirect_tournament(conn, tournament, current_user, params) do
    case tournament.state do
      state when state in ["active", "waiting_participants"] ->
        redirect_to_latest_game_or_tournament(conn, tournament, current_user, params)

      "finished" ->
        redirect_finished_tournament(conn, tournament)

      _ ->
        render_tournament(conn, tournament, params)
    end
  end

  defp redirect_to_latest_game_or_tournament(conn, tournament, current_user, params) do
    case Tournament.Context.get_user_latest_game_id(tournament, current_user.id) do
      nil -> render_tournament(conn, tournament, params)
      latest_game_id -> redirect(conn, to: Routes.game_path(conn, :show, latest_game_id))
    end
  end

  defp redirect_finished_tournament(conn, %{group_tournament_id: nil}) do
    redirect(conn, to: Routes.root_path(conn, :index))
  end

  defp redirect_finished_tournament(conn, tournament) do
    redirect(conn, to: Routes.group_tournament_path(conn, :show, tournament.group_tournament_id))
  end

  # Scrapers come as guests; answer them with the tournament's preview, not the login redirect.
  defp link_preview(%{assigns: %{current_user: %{is_guest: true}}, params: %{"id" => id}} = conn, _opts) do
    with true <- LinkPreview.scraper?(conn),
         %{} = tournament <- Tournament.Context.get(id) do
      conn
      |> put_tournament_meta_tags(tournament)
      |> LinkPreview.send_head()
    else
      _ -> conn
    end
  end

  defp link_preview(conn, _opts), do: conn

  defp put_tournament_meta_tags(conn, tournament) do
    image = Routes.tournament_image_url(conn, :show, tournament.id)

    put_meta_tags(
      conn,
      Map.merge(OgImage.meta_image(image), %{
        title: "🏆 #{tournament.name} · Codebattle",
        description: tournament_meta_description(tournament),
        url: Routes.tournament_url(conn, :show, tournament.id)
      })
    )
  end

  defp render_tournament(conn, tournament, params) do
    conn
    |> put_tournament_meta_tags(tournament)
    |> CodebattleWeb.Frontend.put_layout()
    |> render_inertia("TournamentRoom", %{
      "tournament_id" => tournament.id,
      "event_id" => tournament.event_id,
      "tournament_access_token" => params["access_token"]
    })
  end

  # Guests: what the tournament is, what Codebattle is, and the way in (sign up, then join).
  defp render_public_tournament(conn, tournament) do
    season = Season.get_current_season()

    conn
    |> put_tournament_meta_tags(tournament)
    |> CodebattleWeb.Frontend.put_layout()
    |> render_inertia("TournamentPublic", %{
      "tournament" => public_tournament_json(tournament),
      "top_players" => public_top_players(tournament),
      "season" => season && %{name: season.name, year: season.year},
      "next" => current_path(conn),
      "dev_sign_in" => Application.get_env(:codebattle, :dev_sign_in, false) == true
    })
  end

  defp public_tournament_json(tournament) do
    tournament
    |> Map.take([
      :id,
      :name,
      :description,
      :type,
      :grade,
      :state,
      :break_state,
      :show_results,
      :access_type,
      :level,
      :task_provider,
      :task_pack_name,
      :players_limit,
      :rounds_limit,
      :current_round_position,
      :starts_at,
      :started_at,
      :finished_at
    ])
    |> Map.put(:players_count, Helpers.players_count(tournament))
  end

  # The current top five, once there are results to show.
  defp public_top_players(%{state: state, show_results: true, ranking_type: "by_user"} = tournament)
       when state in ["active", "finished"] do
    tournament
    |> Ranking.get_page(1, 5)
    |> Map.get(:entries, [])
    |> Enum.map(&Map.take(&1, [:id, :place, :score, :name, :lang]))
  end

  defp public_top_players(_tournament), do: []

  # The edit form's values: the same settings plus identity and the current start time.
  defp edit_tournament_json(tournament) do
    creator = tournament.creator_id && User.get(tournament.creator_id)

    tournament
    |> last_tournament_json()
    |> Map.merge(%{
      id: tournament.id,
      state: tournament.state,
      starts_at: tournament.starts_at,
      creator: creator && %{id: creator.id, name: creator.name}
    })
  end

  # Shaped to match TournamentForm's field names so the "Use my last tournament's
  # settings" button can prefill the form. `starts_at` is intentionally omitted
  # (it must be a future time the organizer picks anew).
  defp last_tournament_json(nil), do: nil

  defp last_tournament_json(tournament) do
    %{
      type: tournament.type,
      name: tournament.name,
      description: tournament.description,
      access_type: tournament.access_type,
      task_provider: tournament.task_provider,
      task_strategy: tournament.task_strategy,
      level: tournament.level,
      task_pack_name: tournament.task_pack_name,
      moderator_ids: tournament.moderator_ids,
      players_limit: tournament.players_limit,
      rounds_limit: tournament.rounds_limit,
      timeout_mode: tournament.timeout_mode,
      round_timeout_seconds: tournament.round_timeout_seconds,
      tournament_timeout_seconds: tournament.tournament_timeout_seconds,
      break_duration_seconds: tournament.break_duration_seconds,
      use_chat: tournament.use_chat,
      ranking_type: tournament.ranking_type,
      score_strategy: tournament.score_strategy,
      meta: tournament.meta
    }
  end

  # "Swiss tournament · Elementary · 42 players. Starts 14 Oct 2026, 18:00 UTC. <description>"
  defp tournament_meta_description(tournament) do
    type = if tournament.type == "ladder", do: gettext("Ladder tournament"), else: gettext("Swiss tournament")

    level =
      tournament.task_provider == "level" && tournament.level &&
        Gettext.gettext(CodebattleWeb.Gettext, String.capitalize(tournament.level))

    players = gettext("Players") <> ": #{Helpers.players_count(tournament)}"

    summary = Enum.join(Enum.filter([type, level, players], &is_binary/1), " · ")

    [summary <> ".", tournament_meta_call(tournament), tournament.description]
    |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
    |> Enum.join(" ")
  end

  defp tournament_meta_call(%{state: state, starts_at: %DateTime{} = starts_at})
       when state in ["upcoming", "waiting_participants"] do
    gettext("Starts %{date} UTC. Join and battle for the top!", date: Calendar.strftime(starts_at, "%d %b %Y, %H:%M"))
  end

  defp tournament_meta_call(%{state: "active"}), do: gettext("Live now: watch the battles.")
  defp tournament_meta_call(%{state: "finished"}), do: gettext("Finished: see the results.")
  defp tournament_meta_call(_tournament), do: nil
end
