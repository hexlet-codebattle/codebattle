defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router
  use Plug.ErrorHandler

  import Phoenix.LiveDashboard.Router

  require Logger

  pipeline :admins_only do
    plug(CodebattleWeb.Plugs.AssignCurrentUser)
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
    plug(CodebattleWeb.Plugs.AssignCurrentUser)
    plug(CodebattleWeb.Plugs.ForceRedirect)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug(PhoenixGon.Pipeline)
    plug(CodebattleWeb.Plugs.AssignGon)
    plug(CodebattleWeb.Plugs.Locale)
  end

  pipeline :empty_layout do
    plug(:put_layout, {CodebattleWeb.LayoutView, :empty})
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(:fetch_session)
    plug(CodebattleWeb.Plugs.AssignCurrentUser)
    plug(CodebattleWeb.Plugs.ForceRedirect)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :token_api do
    plug(:accepts, ["json"])
    plug(:put_secure_browser_headers)
  end

  pipeline :mounted_apps do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:put_secure_browser_headers)
  end

  scope "/token_api", CodebattleWeb.TokenApi do
    pipe_through([:token_api])
    post("/execute", ExecutorController, :execute)
  end

  scope "/", CodebattleWeb do
    get("/health", HealthController, :index)
  end

  scope "/" do
    pipe_through([:browser, :admins_only])
    live_dashboard("/dashboard", metrics: CodebattleWeb.Telemetry)
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
      resources("/reset_password", ResetPasswordController, only: [:create], singleton: true)
      resources("/session", SessionController, only: [:create], singleton: true)
      resources("/settings", SettingsController, only: [:show, :update], singleton: true)
      resources("/tasks", TaskController)
      post("/tasks/build", TaskController, :build)
      post("/tasks/check", TaskController, :check)
      get("/tasks/:name/unique", TaskController, :unique)
      resources("/users", UserController, only: [:index, :show, :create])
      post("/playbooks/approve", PlaybookController, :approve)
      post("/playbooks/reject", PlaybookController, :reject)
    end

    scope "/v1", V1, as: :v1 do
      pipe_through(:require_api_auth)

      resources("/feedback", FeedbackController, only: [:index, :create])
      get("/:user_id/activity", ActivityController, :show)

      scope("/games") do
        resources("/:id/user_game_reports", UserGameReportController, only: [:create])
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

    resources("/session", SessionController, singleton: true, only: [:delete, :new])
    get("/remind_password", SessionController, :remind_password)

    resources("/tournaments", TournamentController, only: [:index, :show])

    scope "/tournaments" do
      get("/:id/image", Tournament.ImageController, :show, as: :tournament_image)
      get("/:id/player/:player_id", Tournament.PlayerController, :show, as: :tournament_player)
    end

    scope "/tournaments" do
      pipe_through(:empty_layout)
      get("/:id/timer", LiveViewTournamentController, :show_timer, as: :tournament_timer)
    end

    get("/clans/", ClanController, :index)
    get("/clans/:id", ClanController, :show)
    resources("/users", UserController, only: [:new])
    resources("/feedback", FeedbackController, only: [:index])

    resources("/games", GameController, only: [:show]) do
      get("/image", Game.ImageController, :show, as: :image)
    end

    scope "/games" do
      post("/training", GameController, :create_training)
    end
  end

  scope "/", CodebattleWeb do
    pipe_through([:browser, :require_auth])

    resources("/users", UserController, only: [:index, :show])
    get("/settings", UserController, :edit, as: :user_setting)

    resources("/task_packs", TaskPackController) do
      patch("/activate", TaskPackController, :activate, as: :activate)
      patch("/disable", TaskPackController, :disable, as: :disable)
    end

    resources("/tasks", TaskController) do
      patch("/activate", TaskController, :activate, as: :activate)
      patch("/disable", TaskController, :disable, as: :disable)
    end

    resources("/games", GameController, only: [:delete])

    scope "/games" do
      post("/:id/join", GameController, :join)
    end

    # only for dev-admin liveView experiments
    resources("/live_view_tournaments", LiveViewTournamentController,
      only: [:index, :show, :edit]
    )
  end

  scope "/feature-flags" do
    pipe_through([:mounted_apps, :admins_only])
    forward("/", FunWithFlags.UI.Router, namespace: "feature-flags")
  end

  def handle_errors(conn, %{reason: %Ecto.NoResultsError{}}) do
    conn
    |> put_status(:not_found)
    |> json(%{error: "NOT_FOUND"})
    |> halt
  end

  def handle_errors(conn, %{reason: %Phoenix.Router.NoRouteError{}}) do
    conn
    |> put_status(:not_found)
    |> json(%{error: "NOT_FOUND"})
    |> halt
  end

  def handle_errors(conn, %{kind: _kind, reason: reason}) do
    Logger.error(inspect(reason))
    send_resp(conn, conn.status, "SOMETHING_WENT_WRONG, reason: #{inspect(reason)}")
  end
end
