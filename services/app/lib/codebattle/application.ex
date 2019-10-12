defmodule Codebattle.Application do
  @moduledoc false
  use Application

  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  def start(_type, _args) do
    unless Mix.env() == :prod do
      Envy.load(["../../.env"])
      Envy.reload_config()
    end

    import Supervisor.Spec

    # Define workers and child supervisors to be supervised
    children = [
      # Start the Ecto repository
      supervisor(Codebattle.Repo, []),
      # Start the endpoint when the application starts
      supervisor(CodebattleWeb.Endpoint, []),
      # Start your own worker by calling: Codebattle.Worker.start_link(arg1, arg2, arg3)
      # worker(Codebattle.Worker, [arg1, arg2, arg3]),
      worker(Codebattle.GameProcess.TasksQueuesServer, []),
      supervisor(Codebattle.GameProcess.GlobalSupervisor, []),
      worker(Codebattle.Bot.CreatorServer, [])
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Codebattle.Supervisor]
    Supervisor.start_link(children, opts)
    # Codebattle.GameProcess.Supervisor.start_link
    # Codebattle.Chat.Supervisor.start_link
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  def config_change(changed, _new, removed) do
    CodebattleWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
