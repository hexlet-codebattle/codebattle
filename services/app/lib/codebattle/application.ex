defmodule Codebattle.Application do
  @moduledoc false
  use Application

  def start(_type, _args) do
    import Supervisor.Spec

    unless Mix.env() == :prod do
      Envy.load(["../../.env"])
      Envy.reload_config()
    end

    prod_workers =
      if Mix.env() == :prod do
        [worker(Codebattle.DockerLangsPuller, [])]
      else
        []
      end

    children =
      [
        supervisor(Codebattle.Repo, []),
        supervisor(CodebattleWeb.Endpoint, []),
        worker(Codebattle.GameProcess.TasksQueuesServer, []),
        supervisor(Codebattle.GameProcess.GlobalSupervisor, []),
        worker(Codebattle.Bot.CreatorServer, [])
      ] ++ prod_workers

    opts = [strategy: :one_for_one, name: Codebattle.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    CodebattleWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
