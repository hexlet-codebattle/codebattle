defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router
  use Plug.ErrorHandler

  import Phoenix.LiveDashboard.Router

  alias CodebattleWeb.Plugs.AssignCurrentUser
  alias CodebattleWeb.Plugs.MaintenanceMode
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
    plug(AssignCurrentUser)
    plug(MaintenanceMode)
    plug(RescrictAccess)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug(PhoenixGon.Pipeline)
    plug(CodebattleWeb.Plugs.AssignGon)
    plug(CodebattleWeb.Plugs.Locale)
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(:fetch_session)
    plug(AssignCurrentUser)
    plug(MaintenanceMode)
    plug(RescrictAccess)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :ext_api do
    plug(:accepts, ["json"])
    plug(:put_secure_browser_headers)
  end

  pipeline :empty_layout do
    plug(:put_layout, {CodebattleWeb.LayoutView, :empty})
  end

  pipeline :public_api do
    plug(:accepts, ["json"])
  end

  pipeline :mounted_apps do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:put_secure_browser_headers)
  end

  scope "/ext_api", CodebattleWeb.ExtApi, as: :ext_api do
    pipe_through([:ext_api])
    post("/users", UserController, :create)
    post("/tasks", TaskController, :create)
    post("/task_packs", TaskPackController, :create)
  end

  scope "/", CodebattleWeb do
    get("/health", HealthController, :index)
  end

  scope "/admin" do
    pipe_through([:browser, :admins_only])
    live_dashboard("/dashboard", metrics: CodebattleWeb.Telemetry)
    live("/users", CodebattleWeb.Live.Admin.User.IndexView, :index)
    live("/users/:id", CodebattleWeb.Live.Admin.UserShowView, :show)
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

  scope "/api", CodebattleWeb.Api, as: :api do
    pipe_through(:api)

    scope "/v1", V1, as: :v1 do
      scope("/games") do
        get("/completed", GameController, :completed)
      end

      get("/:user_id/activity", ActivityController, :show)
      get("/game_activity", GameActivityController, :show)
      get("/playbook/:id", PlaybookController, :show)
      get("/user/:id/stats", UserController, :stats)
      get("/user/:id/simple_stats", UserController, :simple_stats)
      get("/user/premium_requests", UserController, :premium_requests)
      post("/user/:id/send_premium_request", UserController, :send_premium_request)
      get("/user/current", UserController, :current)
      resources("/users", UserController, only: [:index, :show, :create])
      resources("/reset_password", ResetPasswordController, only: [:create], singleton: true)
      resources("/session", SessionController, only: [:create], singleton: true)
      resources("/settings", SettingsController, only: [:show, :update], singleton: true)
      resources("/tasks", TaskController)
      post("/tasks/build", TaskController, :build)
      post("/tasks/check", TaskController, :check)
      get("/tasks/:name/unique", TaskController, :unique)
      get("/stream_configs", StreamConfigController, :index)
      put("/stream_configs", StreamConfigController, :put_all)
      post("/playbooks/approve", PlaybookController, :approve)
      post("/playbooks/reject", PlaybookController, :reject)
      get("/events/:id/leaderboard", Event.LeaderboardController, :show)
    end

    scope "/v1", V1, as: :v1 do
      pipe_through(:require_api_auth)

      resources("/feedback", FeedbackController, only: [:index, :create])
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
    get("/feedback/rss.xml", RootController, :feedback)

    get("/", RootController, :index)
    get("/maintenance", RootController, :maintenance)
    get("/waiting", RootController, :waiting)

    resources("/session", SessionController, singleton: true, only: [:delete, :new, :create])
    get("/session/external/signup", SessionController, :external_signup)
    get("/remind_password", SessionController, :remind_password)

    resources("/tournaments", TournamentController, only: [:index, :show])

    scope "/tournaments" do
      get("/:id/admin", Tournament.AdminController, :show)
      get("/:id/image", Tournament.ImageController, :show, as: :tournament_image)
      get("/:id/player/:player_id", Tournament.PlayerController, :show, as: :tournament_player)
    end

    scope "/tournaments" do
      pipe_through(:empty_layout)
      get("/:id/timer", LiveViewTournamentController, :show_timer, as: :tournament_timer)
    end

    resources("/clans", ClanController, only: [:index, :show])

    resources("/events", EventController)
    get("/e/:slug", PublicEventController, :show)
    post("/e/:slug/stage", PublicEventController, :stage)

    resources("/users", UserController, only: [:new, :index, :show])
    get("/settings", UserController, :edit, as: :user_setting)
    resources("/feedback", FeedbackController, only: [:index])

    resources("/task_packs", TaskPackController) do
      patch("/activate", TaskPackController, :activate, as: :activate)
      patch("/disable", TaskPackController, :disable, as: :disable)
    end

    resources("/raw_tasks", RawTaskController)

    resources("/tasks", TaskController) do
      patch("/activate", TaskController, :activate, as: :activate)
      patch("/disable", TaskController, :disable, as: :disable)
    end

    resources("/games", GameController, only: [:show, :delete]) do
      get("/image", Game.ImageController, :show, as: :image)
    end

    scope "/games" do
      post("/training", GameController, :create_training)
      post("/:id/join", GameController, :join)
    end

    # only for dev-admin liveView experiments
    resources("/live_view_tournaments", LiveViewTournamentController, only: [:index, :show, :edit])
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
          |> put_view(CodebattleWeb.ErrorView)
          |> render("404.html")
          |> halt()
        end

      _ ->
        # Default to HTML for browser requests if no Accept header
        conn
        |> put_resp_content_type("text/html")
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
          |> put_view(CodebattleWeb.ErrorView)
          |> render("404.html")
          |> halt()
        end

      _ ->
        # Default to HTML for browser requests if no Accept header
        conn
        |> put_resp_content_type("text/html")
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
