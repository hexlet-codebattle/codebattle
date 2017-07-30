defmodule CodebattleWeb.Router do
  use Codebattle.Web, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug Codebattle.Plugs.Authorization
    plug CodebattleWeb.Locale
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/auth", CodebattleWeb do
    pipe_through :browser

    get "/logout", AuthController, :logout

    get "/:provider", AuthController, :request
    get "/:provider/callback", AuthController, :callback
  end

  scope "/", CodebattleWeb do
    pipe_through :browser # Use the default browser stack

    get "/", PageController, :index

    resources "/games", GameController
  end

  # Other scopes may use custom stacks.
  # scope "/api", Codebattle do
  #   pipe_through :api
  # end
end
