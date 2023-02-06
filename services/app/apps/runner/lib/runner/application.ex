defmodule Runner.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    if Application.get_env(:runner, :load_dot_env_file) do
      Envy.load(["../../.env"])
      Envy.reload_config()
    end

    prod_workers =
      if Application.get_env(:codebattle, :use_prod_workers) do
        [
          {Runner.DockerImagesPuller, []}
        ]
      else
        []
      end

    children =
      [
        {Phoenix.PubSub, name: Runner.PubSub},
        {Runner.StaleContainersKiller, []},
        RunnerWeb.Endpoint
      ] ++ prod_workers

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [
      strategy: :one_for_one,
      name: Runner.Supervisor,
      max_restarts: 13_579,
      max_seconds: 11
    ]

    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    RunnerWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
