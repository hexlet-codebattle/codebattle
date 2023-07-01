defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router
  use Plug.ErrorHandler

  import Phoenix.LiveDashboard.Router

  require Logger

  pipeline :admins_only do
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
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug(PhoenixGon.Pipeline)
    plug(CodebattleWeb.Plugs.AssignGon)
    plug(CodebattleWeb.Plugs.Locale)
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(:fetch_session)
    plug(CodebattleWeb.Plugs.AssignCurrentUser)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
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
        resources("/:id/player_reports", PlayerReportController, only: [:index, :show, :create])
      end

      get("/:user_id/activity", ActivityController, :show)
      get("/game_activity", GameActivityController, :show)
      get("/playbook/:id", PlaybookController, :show)
      get("/user/:id/stats", UserController, :stats)
      get("/user/current", UserController, :current)
      resources("/reset_password", ResetPasswordController, only: [:create], singleton: true)
      resources("/session", SessionController, only: [:create], singleton: true)
      resources("/settings", SettingsController, only: [:show, :update], singleton: true)
      resources("/tasks", TaskController, only: [:index, :show])
      post("/tasks/:name/unique", TaskController, :unique)
      resources("/users", UserController, only: [:index, :show, :create])
      post("/playbooks/approve", PlaybookController, :approve)
      post("/playbooks/reject", PlaybookController, :reject)
    end

    scope "/v1", V1, as: :v1 do
      pipe_through(:require_api_auth)

      resources("/feedback", FeedbackController, only: [:index, :create])
      get("/:user_id/activity", ActivityController, :show)
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

    resources("/tournaments", TournamentController, only: [:index, :show, :edit]) do
      get("/live", TournamentController, :live, as: :live)
    end

    resources("/users", UserController, only: [:new])

    resources("/react_tournaments", ReactTournamentController, only: [:index, :show])

    scope "/tournaments" do
      get("/:id/image", Tournament.ImageController, :show, as: :tournament_image)
    end

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

    get("/settings", UserController, :edit, as: :user_setting)
    put("/settings", UserController, :update, as: :user_setting)

    resources("/users", UserController, only: [:index, :show])

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
