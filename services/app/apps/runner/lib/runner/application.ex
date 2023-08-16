defmodule Runner.Application do
  @moduledoc false

  use Application

  @app_dir File.cwd!()

  @impl true
  def start(_type, _args) do
    if Application.get_env(:runner, :load_dot_env_file) do
      root_dir = @app_dir |> Path.join("../../../../") |> Path.expand()
      config_path = Mix.Project.config() |> Keyword.get(:config_path)
      env_path = Path.join(root_dir, ".env")

      Envy.load([env_path])
      Config.Reader.read!(config_path) |> Application.put_all_env()
    end

    prod_workers =
      if Application.get_env(:runner, :use_prod_workers) do
        [{Runner.DockerImagesPuller, []}]
      else
        []
      end

    children =
      [
        {RunnerWeb.Endpoint, []},
        %{
          # PubSub for internal messages
          id: Runner.PubSub,
          start: {Phoenix.PubSub.Supervisor, :start_link, [[name: Runner.PubSub]]}
        },
        {Runner.StaleContainersKiller, []}
      ] ++ prod_workers

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
