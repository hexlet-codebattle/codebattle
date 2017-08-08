defmodule Codebattle do
  @moduledoc false

  use Application

  # See http://elixir-lang.org/docs/stable/elixir/Application.html
  # for more information on OTP Applications
  def start(_type, _args) do
    import Supervisor.Spec

    # Define workers and child supervisors to be supervised
    children = [
      # Start the Ecto repository
      supervisor(Codebattle.Repo, []),
      # Start the endpoint when the application starts
      supervisor(CodebattleWeb.Endpoint, []),
      # Start your own worker by calling:
      #   Codebattle.Worker.start_link(arg1, arg2, arg3)
      # worker(Codebattle.Worker, [arg1, arg2, arg3]),
      supervisor(CodebattleWeb.Presence, []),
    ]

    # See http://elixir-lang.org/docs/stable/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Codebattle.Supervisor]
    Supervisor.start_link(children, opts)
    Play.Supervisor.start_link
  end
end
