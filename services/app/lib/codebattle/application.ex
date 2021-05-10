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
          worker(Codebattle.TasksImporter, [])
        ]
      else
        []
      end

    without_tests_workers =
      if Mix.env() != :test do
        [
          worker(Codebattle.InvitesKillerServer, [])
        ]
      else
        []
      end

    children =
      [
        supervisor(Codebattle.Repo, []),
        CodebattleWeb.Telemetry,
        {Phoenix.PubSub, [name: :cb_pubsub, adapter: Phoenix.PubSub.PG2]},
        supervisor(CodebattleWeb.Presence, []),
        supervisor(CodebattleWeb.Endpoint, []),
        worker(Codebattle.GameProcess.TasksQueuesServer, []),
        supervisor(Codebattle.GameProcess.GlobalSupervisor, []),
        supervisor(Codebattle.Tournament.GlobalSupervisor, []),
        worker(Codebattle.Bot.CreatorServer, []),
        worker(Codebattle.Utils.ContainerGameKiller, []),
        worker(Codebattle.UsersActivityServer, [])
      ] ++ prod_workers ++ without_tests_workers

    Supervisor.start_link(children, strategy: :one_for_one, name: __MODULE__)
  end

  def config_change(changed, _new, removed) do
    CodebattleWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
