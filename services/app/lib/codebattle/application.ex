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
        [
          worker(Codebattle.DockerLangsPuller, []),
          worker(Codebattle.AssertsImporter, [])
        ]
      else
        []
      end

    children =
      [
        supervisor(Codebattle.Repo, []),
        supervisor(CodebattleWeb.Endpoint, []),
        worker(Codebattle.GameProcess.TasksQueuesServer, []),
        supervisor(Codebattle.GameProcess.GlobalSupervisor, []),
        supervisor(Codebattle.Tournament.Supervisor, []),
        worker(Codebattle.Bot.CreatorServer, [])
      ] ++ prod_workers

    Supervisor.start_link(children, strategy: :one_for_one, name: __MODULE__)
  end

  def config_change(changed, _new, removed) do
    CodebattleWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
