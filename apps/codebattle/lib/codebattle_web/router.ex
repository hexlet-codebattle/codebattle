defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router
  use Plug.ErrorHandler

  import Phoenix.LiveDashboard.Router

  alias CodebattleWeb.Admin.GroupTaskController
  alias CodebattleWeb.Admin.TournamentDuplicatorController
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
    plug(:put_layout, html: {CodebattleWeb.LayoutView, :empty})
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

  scope "/admin" do
    pipe_through([:browser, :admins_only])
    live_dashboard("/dashboard", metrics: CodebattleWeb.Telemetry)
    live("/", CodebattleWeb.Live.Admin.IndexView, :index)
    live("/events", CodebattleWeb.Live.Admin.EventIndexView, :index)
    live("/games", CodebattleWeb.Live.Admin.Game.IndexView, :index)
    live("/code-checks", CodebattleWeb.Live.Admin.CodeCheck.IndexView, :index)
    live("/feedback", CodebattleWeb.Live.Admin.Feedback.IndexView, :index)
    live("/users", CodebattleWeb.Live.Admin.User.IndexView, :index)
    live("/users/:id", CodebattleWeb.Live.Admin.UserShowView, :show)
    live("/seasons", CodebattleWeb.Live.Admin.Season.IndexView, :index)
    live("/seasons/:id/edit", CodebattleWeb.Live.Admin.Season.EditView, :edit)
    live("/seasons/:id", CodebattleWeb.Live.Admin.Season.ShowView, :show)
    resources("/events", CodebattleWeb.EventController, except: [:index])
    post("/events/:id/enroll_all", CodebattleWeb.EventController, :enroll_all, as: :event_enroll_all)
    get("/group_tasks/:id/runs/:run_id/:part", GroupTaskController, :download_run_part, as: :group_task_run_part)

    get("/group_tasks/:id/solutions/:solution_id/edit", GroupTaskController, :edit_solution,
      as: :edit_group_task_solution
    )

    patch("/group_tasks/:id/solutions/:solution_id", GroupTaskController, :update_solution,
      as: :update_group_task_solution
    )

    delete("/group_tasks/:id/solutions/:solution_id", GroupTaskController, :delete_solution, as: :group_task_solution)

    post("/group_tasks/:group_task_id/runs", CodebattleWeb.Admin.GroupTaskRunController, :create, as: :group_task_run)

    post("/group_tasks/:group_task_id/tokens", CodebattleWeb.Admin.GroupTaskTokenController, :create,
      as: :group_task_token
    )

    resources("/group_tasks", GroupTaskController)

    post("/group_tournaments/:id/start", CodebattleWeb.Admin.GroupTournamentController, :start,
      as: :admin_group_tournament
    )

    post("/group_tournaments/:id/finish", CodebattleWeb.Admin.GroupTournamentController, :finish,
      as: :admin_group_tournament
    )

    post("/group_tournaments/:id/cancel", CodebattleWeb.Admin.GroupTournamentController, :cancel,
      as: :admin_group_tournament
    )

    post("/group_tournaments/:id/check", CodebattleWeb.Admin.GroupTournamentController, :check,
      as: :admin_group_tournament
    )

    post("/group_tournaments/:id/reset", CodebattleWeb.Admin.GroupTournamentController, :reset,
      as: :admin_group_tournament
    )

    post("/group_tournaments/:id/tokens", CodebattleWeb.Admin.GroupTournamentController, :create_token,
      as: :admin_group_tournament
    )

    post("/group_tournaments/:id/add_user", CodebattleWeb.Admin.GroupTournamentController, :add_user,
      as: :admin_group_tournament
    )

    resources("/group_tournaments", CodebattleWeb.Admin.GroupTournamentController, as: :admin_group_tournament)

    get("/tournament_duplicator", TournamentDuplicatorController, :new, as: :admin_tournament_duplicator)

    post("/tournament_duplicator", TournamentDuplicatorController, :create, as: :admin_tournament_duplicator)
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
      get("/user/nearby_users", UserController, :nearby_users)
      get("/user/:id/stats", UserController, :stats)
      get("/user/:id/rivals", UserController, :rivals)
      get("/user/:id/tournaments", UserController, :tournaments)
      get("/user/:id/achievements", UserController, :achievements)
      get("/user/:id/simple_stats", UserController, :simple_stats)
      get("/user/premium_requests", UserController, :premium_requests)
      post("/user/:id/send_premium_request", UserController, :send_premium_request)
      get("/user/current", UserController, :current)
      resources("/users", UserController, only: [:index, :show, :create])
      resources("/reset_password", ResetPasswordController, only: [:create], singleton: true)
      resources("/session", SessionController, only: [:create], singleton: true)
      resources("/settings", SettingsController, only: [:show, :update], singleton: true)
      resources("/tasks", TaskController, only: [:index, :show, :update])
      get("/tasks/:id/stats", TaskController, :stats)
      resources("/tournaments", TournamentController, only: [:index, :show, :create, :update])
      get("/stream_configs", StreamConfigController, :index)
      put("/stream_configs", StreamConfigController, :put_all)
      post("/playbooks/approve", PlaybookController, :approve)
      post("/playbooks/reject", PlaybookController, :reject)
      get("/events/:id/leaderboard", Event.LeaderboardController, :show)
      get("/seasons/:season_id/players/:user_id/stats", SeasonResultController, :player_stats)
      get("/group_tournaments/:id", GroupTournamentController, :show)
      post("/group_tournaments/:id/join", GroupTournamentController, :join)
      post("/group_tournaments/:id/submit_solution", GroupTournamentController, :submit_solution)
      post("/group_tournaments/:id/tokens", GroupTournamentController, :create_token)
      post("/group_tournaments/:id/confirm_invitation", GroupTournamentController, :confirm_invitation)
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

  scope "/api", CodebattleWeb.Api, as: :api do
    pipe_through(:public_api)

    scope "/v1", V1, as: :v1 do
      post("/group_task_solutions", GroupTaskSolutionController, :create)
    end
  end

  scope "/", CodebattleWeb do
    # Use the default browser stack
    pipe_through(:browser)
    get("/broadcast-editor", BroadcastEditorController, :index)

    get("/cssbattle/builder", CssBattleBuilderController, :index)

    get("/robots.txt", RootController, :robots)
    get("/sitemap.xml", RootController, :sitemap)
    get("/feedback/rss.xml", RootController, :feedback)

    get("/", RootController, :index)
    get("/maintenance", RootController, :maintenance)
    get("/waiting", RootController, :waiting)
    get("/authorized", RootController, :authorized)

    resources("/session", SessionController, singleton: true, only: [:delete, :new, :create])
    get("/session/external/signup", SessionController, :external_signup)
    get("/remind_password", SessionController, :remind_password)

    resources("/tournaments", TournamentController, only: [:index, :show, :edit])
    get("/group_tournaments/:id", GroupTournamentController, :show)
    post("/group_tournaments/:id/request_invite", GroupTournamentController, :request_invite)
    get("/group_tournaments/:id/admin", GroupTournamentController, :admin, as: :group_tournament_admin)

    get("/stream", StreamController, :index)
    get("/schedule", TournamentsScheduleController, :index)
    get("/stream/preset", StreamController, :stream_preset)
    get("/hall_of_fame", HallOfFameController, :index)
    get("/h2h/:user_id/:opponent_id", HeadToHeadController, :show)

    resources("/seasons", SeasonController, only: [:index, :show])

    scope "/tournaments" do
      get("/:id/admin", Tournament.AdminController, :show)
      get("/:id/stream", Tournament.StreamController, :show)
      get("/:id/image", Tournament.ImageController, :show, as: :tournament_image)
      get("/:id/player/:player_id", Tournament.PlayerController, :show, as: :tournament_player)
    end

    scope "/tournaments" do
      pipe_through(:empty_layout)
      get("/:id/timer", LiveViewTournamentController, :show_timer, as: :tournament_timer)
    end

    resources("/clans", ClanController, only: [:index, :show])

    get("/e/:slug", PublicEventController, :show)
    post("/e/:slug/stage", PublicEventController, :stage)

    resources("/users", UserController, only: [:new, :index, :show])
    get("/settings", UserController, :edit, as: :user_setting)
    resources("/feedback", FeedbackController, only: [:index])

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

    get("/games/:id/threejs", GameController, :threejs)

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
