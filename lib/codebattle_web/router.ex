defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router
  use Plug.ErrorHandler

  import Oban.Web.Router
  import Phoenix.LiveDashboard.Router

  alias CodebattleWeb.Admin.TournamentDuplicatorController
  alias CodebattleWeb.Plugs.AnonymousRateLimit
  alias CodebattleWeb.Plugs.AssignCurrentUser
  alias CodebattleWeb.Plugs.MaintenanceMode
  alias CodebattleWeb.Plugs.McpOauthRateLimit
  alias CodebattleWeb.Plugs.PublicApi.RateLimit
  alias CodebattleWeb.Plugs.PublicApi.TokenAuth
  alias CodebattleWeb.Plugs.RescrictAccess

  require Logger

  pipeline :admins_only do
    plug(AssignCurrentUser)
    plug(CodebattleWeb.Plugs.AdminOnly)
  end

  pipeline :require_auth do
    plug(CodebattleWeb.Plugs.RequireAuth)
  end

  pipeline :require_api_auth do
    plug(CodebattleWeb.Plugs.ApiRequireAuth)
  end

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_flash)
    plug(:fetch_live_flash)
    plug(Inertia.Plug)
    plug(AssignCurrentUser)
    plug(AnonymousRateLimit)
    plug(MaintenanceMode)
    plug(RescrictAccess)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug(CodebattleWeb.Plugs.Locale)
    plug(CodebattleWeb.Plugs.AssignInertiaProps)
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(:fetch_session)
    plug(AssignCurrentUser)
    plug(AnonymousRateLimit)
    plug(MaintenanceMode)
    plug(RescrictAccess)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :ext_api do
    plug(:accepts, ["json"])
    plug(:put_secure_browser_headers)
  end

  pipeline :public_api do
    plug(:accepts, ["json"])
  end

  pipeline :oauth_api do
    plug(:accepts, ["json"])
    plug(:put_secure_browser_headers)
    plug(McpOauthRateLimit)
  end

  # Public API v1: personal token required everywhere, per-user limits.
  pipeline :public_api_v1 do
    plug(:accepts, ["json"])
    plug(:put_secure_browser_headers)
    plug(TokenAuth)
    plug(RateLimit)
    plug(CodebattleWeb.Plugs.PublicApi.RequireJson)
  end

  # The SSE event stream: same auth and limits, but clients send Accept: text/event-stream.
  pipeline :public_api_v1_stream do
    plug(:put_secure_browser_headers)
    plug(TokenAuth)
    plug(RateLimit)
  end

  pipeline :mounted_apps do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    # AdminOnly redirects non-admins with a flash message.
    plug(:fetch_flash)
    plug(:put_secure_browser_headers)
  end

  scope "/ext_api", CodebattleWeb.ExtApi, as: :ext_api do
    pipe_through([:ext_api])
    post("/users", UserController, :create)
    post("/tasks", TaskController, :create)
    post("/task_packs", TaskPackController, :create)
    get("/tournaments/:id", TournamentController, :show)
    post("/load_tests/scenarios", LoadTestController, :create_scenario)
    get("/load_tests/tasks/:id/solutions", LoadTestController, :task_solutions)
  end

  scope "/", CodebattleWeb do
    get("/health", HealthController, :index)
    post("/health/drain", HealthController, :drain)
    post("/health/handoff", HealthController, :handoff)
    get("/health/release_ready", HealthController, :release_ready)
  end

  # Chrome DevTools IDE integration (dev only)
  scope "/.well-known/appspecific", CodebattleWeb do
    get("/com.chrome.devtools.json", DevToolsController, :index)
  end

  scope "/.well-known", CodebattleWeb.Mcp do
    pipe_through(:oauth_api)
    get("/oauth-authorization-server", OauthController, :metadata)
    get("/oauth-protected-resource", OauthController, :resource_metadata)
    get("/oauth-protected-resource/mcp", OauthController, :resource_metadata)
  end

  pipeline :mcp_browser do
    plug(CodebattleWeb.Plugs.McpBrowserRequest)
  end

  scope "/", CodebattleWeb.Mcp do
    pipe_through([:mcp_browser, :browser])
    get("/mcp", PageController, :show)
  end

  scope "/mcp" do
    forward("/", CodebattleWeb.Plugs.McpTransport)
  end

  scope "/oauth", CodebattleWeb.Mcp do
    pipe_through(:oauth_api)
    post("/register", OauthController, :register)
    post("/token", OauthController, :token)
    post("/revoke", OauthController, :revoke)
  end

  scope "/oauth", CodebattleWeb.Mcp do
    pipe_through([:browser, McpOauthRateLimit])
    get("/authorize", OauthController, :authorize)
  end

  scope "/oauth", CodebattleWeb.Mcp do
    pipe_through([:browser, :require_auth, McpOauthRateLimit])
    post("/authorize", OauthController, :consent)
  end

  scope "/admin" do
    pipe_through([:browser, :admins_only])
    live_dashboard("/dashboard", metrics: CodebattleWeb.Telemetry)
    oban_dashboard("/oban")
    get("/connections", CodebattleWeb.AdminController, :connections)
    live("/", CodebattleWeb.Live.Admin.IndexView, :index)
    live("/events", CodebattleWeb.Live.Admin.EventIndexView, :index)
    live("/events/:id/dashboard", CodebattleWeb.Live.Admin.EventDashboardView, :show)
    live("/games", CodebattleWeb.Live.Admin.Game.IndexView, :index)
    live("/code-checks", CodebattleWeb.Live.Admin.CodeCheck.IndexView, :index)
    live("/feedback", CodebattleWeb.Live.Admin.Feedback.IndexView, :index)
    live("/users", CodebattleWeb.Live.Admin.User.IndexView, :index)
    live("/users/:id", CodebattleWeb.Live.Admin.UserShowView, :show)
    live("/clans", CodebattleWeb.Live.Admin.Clan.IndexView, :index)
    live("/invites", CodebattleWeb.Live.Admin.InviteIndexView, :index)
    live("/seasons", CodebattleWeb.Live.Admin.Season.IndexView, :index)
    live("/seasons/:id/edit", CodebattleWeb.Live.Admin.Season.EditView, :edit)
    live("/seasons/:id", CodebattleWeb.Live.Admin.Season.ShowView, :show)
    resources("/events", CodebattleWeb.EventController, except: [:index])
    post("/events/:id/enroll_all", CodebattleWeb.EventController, :enroll_all, as: :event_enroll_all)

    post("/events/:id/calculate_places", CodebattleWeb.EventController, :calculate_places, as: :event_calculate_places)
    live("/tournaments", CodebattleWeb.Live.Admin.TournamentIndexView, :index)

    get("/tournament_duplicator", TournamentDuplicatorController, :new, as: :admin_tournament_duplicator)

    post("/tournament_duplicator", TournamentDuplicatorController, :create, as: :admin_tournament_duplicator)
  end

  scope "/admin", CodebattleWeb do
    pipe_through(:browser)

    get("/tournaments/:id/stream", Tournament.StreamController, :admin, as: :admin_tournament_stream)

    get("/tournaments/:id/stream/state", Tournament.StreamController, :json_state, as: :admin_tournament_stream_state)
  end

  scope "/auth", CodebattleWeb do
    pipe_through(:browser)
    get("/token", AuthController, :token)
    post("/dev_login", DevLoginController, :create)
    get("/:provider", AuthController, :request)
    get("/:provider/callback", AuthController, :callback)

    # for binding
    get("/:provider/bind", AuthBindController, :request)
    get("/:provider/callback/bind", AuthBindController, :callback)
    delete("/:provider", AuthBindController, :unbind)
  end

  scope "/public_api", CodebattleWeb.Api, as: :api do
    pipe_through(:public_api)

    scope "/v1", V1, as: :v1 do
      get("/events/:id/leaderboard", Event.LeaderboardController, :show)
    end
  end

  scope "/public_api", CodebattleWeb.PublicApi, as: :public_api do
    get("/v1/openapi.json", V1.SpecController, :show)
    get("/docs", V1.SpecController, :docs)
  end

  scope "/", CodebattleWeb.PublicApi, as: :public_api do
    get("/api-docs", DocsController, :show)
    get("/api-docs.md", DocsController, :markdown)
    get("/llms.txt", DocsController, :llms_txt)
  end

  scope "/public_api/v1", CodebattleWeb.PublicApi.V1, as: :public_api_v1_stream do
    pipe_through(:public_api_v1_stream)

    get("/me/events", EventController, :stream)
  end

  scope "/public_api/v1", CodebattleWeb.PublicApi.V1, as: :public_api_v1 do
    pipe_through(:public_api_v1)

    get("/me", MeController, :show)
    get("/me/active_game", MeController, :active_game)
    get("/me/games", MeController, :games)
    get("/me/tournaments", MeController, :tournaments)

    get("/tournaments/schedule", TournamentController, :schedule)
    get("/tournaments/live", TournamentController, :live)
    get("/tournaments/:id", TournamentController, :show)
    get("/tournaments/:id/ranking", TournamentController, :ranking)
    post("/tournaments", TournamentController, :create)
    patch("/tournaments/:id", TournamentController, :update)
    post("/tournaments/:id/start", TournamentController, :start)
    post("/tournaments/:id/cancel", TournamentController, :cancel)
    post("/tournaments/:id/join", TournamentController, :join)
    post("/tournaments/:id/leave", TournamentController, :leave)

    get("/tasks", TaskController, :index)

    get("/games/live", GameController, :live)
    post("/games", GameController, :create)
    post("/games/:id/join", GameController, :join)
    post("/games/:id/cancel", GameController, :cancel)

    get("/me/invites", InviteController, :index)
    post("/invites", InviteController, :create)
    post("/invites/:id/accept", InviteController, :accept)
    post("/invites/:id/cancel", InviteController, :cancel)

    get("/users/online", UserController, :online)
  end

  scope "/api", CodebattleWeb.Api, as: :api do
    pipe_through(:api)

    scope "/v1", V1, as: :v1 do
      scope("/games") do
        get("/completed", GameController, :completed)
      end

      get("/:user_id/activity", ActivityController, :show)
      get("/game_activity", GameActivityController, :show)
      get("/playbook/:id", PlaybookController, :show)
      get("/leaderboard/elo", LeaderboardController, :elo)
      get("/leaderboard/season", LeaderboardController, :season)
      get("/user/nearby_users", UserController, :nearby_users)
      get("/user/:id/stats", UserController, :stats)
      get("/user/:id/rivals", UserController, :rivals)
      get("/user/:id/tournaments", UserController, :tournaments)
      get("/user/:id/achievements", UserController, :achievements)
      get("/user/:id/head_to_head", UserController, :head_to_head)
      get("/user/:id/simple_stats", UserController, :simple_stats)
      get("/user/premium_requests", UserController, :premium_requests)
      post("/user/:id/send_premium_request", UserController, :send_premium_request)
      get("/user/current", UserController, :current)
      patch("/locale", LocaleController, :update)
      resources("/users", UserController, only: [:index, :show, :create])
      resources("/reset_password", ResetPasswordController, only: [:create], singleton: true)
      resources("/session", SessionController, only: [:create], singleton: true)
      resources("/settings", SettingsController, only: [:show, :update], singleton: true)
      patch("/settings/password", SettingsController, :update_password)
      patch("/settings/email", SettingsController, :update_email)
      delete("/settings/account", SettingsController, :archive_account)
      get("/settings/sessions", SettingsController, :sessions)
      delete("/settings/sessions/:id", SettingsController, :delete_user_session)
      get("/settings/api_tokens", SettingsController, :api_tokens)
      post("/settings/api_tokens", SettingsController, :create_api_token)
      delete("/settings/api_tokens/:id", SettingsController, :delete_api_token)
      get("/settings/connections", SettingsController, :connections)
      delete("/settings/connections/:id", SettingsController, :delete_connection)
      resources("/tasks", TaskController, only: [:index, :show, :update])
      get("/tasks/:id/stats", TaskController, :stats)
      get("/tournaments/history", TournamentController, :history)
      get("/tournaments/created", TournamentController, :created)
      resources("/tournaments", TournamentController, only: [:index, :show, :create, :update])
      post("/playbooks/approve", PlaybookController, :approve)
      post("/playbooks/reject", PlaybookController, :reject)
      get("/events/:id/leaderboard", Event.LeaderboardController, :show)
      get("/seasons/:season_id/players/:user_id/stats", SeasonResultController, :player_stats)
    end

    scope "/v1", V1, as: :v1 do
      pipe_through(:require_api_auth)

      resources("/feedback", FeedbackController, only: [:index, :create, :update])
      get("/:user_id/activity", ActivityController, :show)

      scope("/games") do
        resources("/:game_id/user_game_reports", UserGameReportController, only: [:create])
      end
    end
  end

  scope "/", CodebattleWeb do
    # Use the default browser stack
    pipe_through(:browser)

    get("/robots.txt", RootController, :robots)
    get("/sitemap.xml", RootController, :sitemap)

    get("/", RootController, :index)
    get("/onboarding", OnboardingController, :show)
    get("/maintenance", RootController, :maintenance)
    get("/waiting", RootController, :waiting)
    get("/authorized", RootController, :authorized)

    resources("/session", SessionController, singleton: true, only: [:delete, :new, :create])
    get("/session/external/signup", SessionController, :external_signup)
    get("/remind_password", SessionController, :remind_password)

    resources("/tournaments", TournamentController, only: [:index, :show, :edit])

    get("/schedule", TournamentsScheduleController, :index)
    get("/hall_of_fame", HallOfFameController, :index)
    get("/privacy", PrivacyController, :show)
    get("/dev", DevController, :show)
    get("/h2h/:user_id/:opponent_id", HeadToHeadController, :show)
    get("/h2h/:user_id/:opponent_id/image", HeadToHead.ImageController, :show, as: :head_to_head_image)

    resources("/seasons", SeasonController, only: [:index, :show])

    scope "/tournaments" do
      get("/:id/stream", Tournament.StreamController, :show)
      get("/:id/image", Tournament.ImageController, :show, as: :tournament_image)
      get("/:id/player/:player_id", Tournament.PlayerController, :show, as: :tournament_player)
    end

    resources("/clans", ClanController, only: [:index, :show, :create, :update, :delete])

    get("/e/:slug", PublicEventController, :show)
    post("/e/:slug/stage", PublicEventController, :stage)

    resources("/users", UserController, only: [:new, :show])
    get("/settings", UserController, :edit, as: :user_setting)

    resources("/task_packs", TaskPackController) do
      patch("/activate", TaskPackController, :activate, as: :activate)
      patch("/disable", TaskPackController, :disable, as: :disable)
    end

    resources("/tasks", TaskController, only: [:index, :show, :delete]) do
      patch("/activate", TaskController, :activate, as: :activate)
      patch("/disable", TaskController, :disable, as: :disable)
    end

    resources("/games", GameController, only: [:show, :delete]) do
      get("/image", Game.ImageController, :show, as: :image)
    end

    get("/games/:id/stream", GameController, :stream)
    get("/games/:id/ml", GameController, :ml)
    post("/games/:id/ml/reviews", GameController, :review)

    scope "/games" do
      post("/training", GameController, :create_training)
      post("/create_by_task", GameController, :create_by_task)
      post("/:id/join", GameController, :join)
    end
  end

  scope "/feature-flags" do
    pipe_through([:mounted_apps, :admins_only])
    forward("/", FunWithFlags.UI.Router, namespace: "feature-flags")
  end

  def handle_errors(conn, %{reason: %Ecto.NoResultsError{}}) do
    conn = put_status(conn, :not_found)

    case Enum.find(conn.req_headers, fn {header, _} -> header == "accept" end) do
      {"accept", value} ->
        if String.contains?(value, "json") do
          conn
          |> json(%{error: "NOT_FOUND"})
          |> halt()
        else
          conn
          |> put_resp_content_type("text/html")
          |> put_layout(html: {CodebattleWeb.LayoutView, :app})
          |> put_view(CodebattleWeb.ErrorView)
          |> render("404.html")
          |> halt()
        end

      _ ->
        # Default to HTML for browser requests if no Accept header
        conn
        |> put_resp_content_type("text/html")
        |> put_layout(html: {CodebattleWeb.LayoutView, :app})
        |> put_view(CodebattleWeb.ErrorView)
        |> render("404.html")
        |> halt()
    end
  end

  def handle_errors(conn, %{reason: %Phoenix.Router.NoRouteError{}}) do
    conn = put_status(conn, :not_found)

    case Enum.find(conn.req_headers, fn {header, _} -> header == "accept" end) do
      {"accept", value} ->
        if String.contains?(value, "json") do
          conn
          |> json(%{error: "NOT_FOUND"})
          |> halt()
        else
          conn
          |> put_resp_content_type("text/html")
          |> put_layout(html: {CodebattleWeb.LayoutView, :app})
          |> put_view(CodebattleWeb.ErrorView)
          |> render("404.html")
          |> halt()
        end

      _ ->
        # Default to HTML for browser requests if no Accept header
        conn
        |> put_resp_content_type("text/html")
        |> put_layout(html: {CodebattleWeb.LayoutView, :app})
        |> put_view(CodebattleWeb.ErrorView)
        |> render("404.html")
        |> halt()
    end
  end

  def handle_errors(conn, %{kind: _kind, reason: reason}) do
    Logger.error(inspect(reason))
    send_resp(conn, conn.status, "SOMETHING_WENT_WRONG, reason: #{inspect(reason)}")
  end
end
