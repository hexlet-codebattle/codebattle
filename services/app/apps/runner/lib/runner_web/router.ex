defmodule RunnerWeb.Router do
  use RunnerWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", RunnerWeb.Api, as: :api do
    pipe_through :api

    scope "/v1", V1, as: :v1 do
      post("/execute", ExecutorController, :execute)
    end
  end
end
