defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router
  use Plug.ErrorHandler

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

    # for binding
    get("/:provider/bind", AuthBindController, :request)
    get("/:provider/callback/bind", AuthBindController, :callback)
    delete("/:provider", AuthBindController, :unbind)
  end

  scope "/api", CodebattleWeb.Api, as: :api do
    pipe_through(:api)

    scope "/v1", V1, as: :v1 do
      get("/:user_id/activity", ActivityController, :show)
      get("/game_activity", GameActivityController, :show)
      get("/playbook/:id", PlaybookController, :show)
      get("/user/:id/stats", UserController, :stats)
      get("/user/:id/completed_games", UserController, :completed_games)
      get("/user/current", UserController, :current)
      resources("/users", UserController, only: [:index, :show, :create])
      resources("/session", SessionController, only: [:create], singleton: true)
      resources("/reset_password", ResetPasswordController, only: [:create], singleton: true)
      resources("/settings", SettingsController, only: [:show, :update], singleton: true)
      post("/feedback", FeedBackController, :index)
      post("/playbooks/approve", PlaybookController, :approve)
      post("/playbooks/reject", PlaybookController, :reject)
    end
  end

  scope "/", CodebattleWeb do
    # Use the default browser stack
    pipe_through(:browser)
    get("/robots.txt", PageController, :robots)
    get("/sitemap.xml", PageController, :sitemap)
    get("/feedback/rss.xml", PageController, :feedback)

    get("/", PageController, :index)

    ## TODO (add-stairways) remove route after template is done
    get("/stairway", GameController, :stairway)

    resources("/session", SessionController, singleton: true, only: [:delete, :new])
    get("/remind_password", SessionController, :remind_password)
    resources("/users", UserController, only: [:index, :show, :new])

    resources("/tournaments", TournamentController, only: [:index, :show]) do
      get("/live", TournamentController, :live, as: :live)
    end

    resources("/react_tournaments", ReactTournamentController, only: [:index, :show])

    resources("/tasks", TaskController, only: [:index, :show, :new, :edit, :create, :update]) do
      patch("/activate", TaskController, :activate, as: :activate)
      patch("/disable", TaskController, :disable, as: :disable)
    end

    resources("/task_packs", TaskPackController,
      only: [:index, :show, :new, :edit, :create, :update]
    ) do
      patch("/activate", TaskPackController, :activate, as: :activate)
      patch("/disable", TaskPackController, :disable, as: :disable)
    end

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
