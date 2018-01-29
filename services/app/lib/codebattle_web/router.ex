defmodule CodebattleWeb.Router do
  use CodebattleWeb, :router

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(CodebattleWeb.Plugs.AssignCurrentUser)
    plug(:fetch_flash)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug(CodebattleWeb.Plugs.AssignGon)
    plug(CodebattleWeb.Plugs.Locale)
  end

  pipeline :api do
    plug(:accepts, ["json"])
  end

  scope "/auth", CodebattleWeb do
    pipe_through(:browser)
    get("/:provider", AuthController, :request)
    get("/:provider/callback", AuthController, :callback)
  end

  scope "/", CodebattleWeb do
    # Use the default browser stack
    pipe_through(:browser)

    resources("/session", SessionController, singleton: true, only: [:delete])
    get("/", PageController, :index)
    resources("/users", UserController, only: [:index, :show, :edit, :update])
    resources("/games", GameController, only: [:create, :show])

    scope "/games" do
      post("/:id/join", GameController, :join)
      post("/:id/check", GameController, :check)
    end
  end

  # Other scopes may use custom stacks.
  # scope "/api", Codebattle do
  #   pipe_through :api
  # end
end
