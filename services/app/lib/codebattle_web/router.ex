defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router
  use Plug.ErrorHandler
  import Phoenix.LiveDashboard.Router

  require Logger

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(CodebattleWeb.Plugs.AssignCurrentUser)
    plug(:fetch_live_flash)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
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

  scope "/auth", CodebattleWeb do
    pipe_through(:browser)
    post("/dev_login", DevLoginController, :create)
    get("/:provider", AuthController, :request)
    get("/:provider/callback", AuthController, :callback)
  end

  scope "/api", CodebattleWeb.Api, as: :api do
    pipe_through(:api)

    scope "/v1", V1, as: :v1 do
      get("/:user_id/activity", ActivityController, :show)
      get("/game_activity", GameActivityController, :show)
      get("/playbook/:id", PlaybookController, :show)
      get("/user/:id/stats", UserController, :stats)
      resources("/users", UserController, only: [:index, :show])
      resources("/settings", SettingsController, only: [:show, :update], singleton: true)
    end
  end

  scope "/", CodebattleWeb do
    # Use the default browser stack
    pipe_through(:browser)
    get("/robots.txt", PageController, :robots)
    get("/sitemap.xml", PageController, :sitemap)

    resources("/session", SessionController, singleton: true, only: [:delete])
    get("/", PageController, :index)
    resources("/users", UserController, only: [:index, :show])
    resources("/tournaments", TournamentController, only: [:index, :show])

    scope "/tournaments" do
      get("/:id/image", Tournament.ImageController, :show, as: :tournament_image)
    end

    get("/settings", UserController, :edit, as: :user_setting)
    put("/settings", UserController, :update, as: :user_setting)
    resources("/games", GameController, only: [:create, :show, :delete])

    scope "/games" do
      post("/:id/join", GameController, :join)
      post("/:id/check", GameController, :check)
      get("/:id/image", Game.ImageController, :show, as: :game_image)
    end
  end

  scope "/" do
    pipe_through(:browser)

    live_dashboard("/dashboard_codebattle",
      metrics: CodebattleWeb.Telemetry,
      ecto_repos: [Codebattle.Repo]
    )
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
    send_resp(conn, conn.status, "SOMETHING_WENT_WRONG")
  end
end
