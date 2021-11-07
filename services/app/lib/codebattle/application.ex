defmodule Codebattle.Application do
  @moduledoc false
  use Application

  def start(_type, _args) do
    unless Mix.env() == :prod do
      Envy.load(["../../.env"])
      Envy.reload_config()
    end

    prod_workers =
      if Mix.env() == :prod do
        [
          {Codebattle.DockerLangsPuller, []},
          {Codebattle.TasksImporter, []}
        ]
      else
        []
      end

    children =
      [
        {Codebattle.Repo, []},
        CodebattleWeb.Telemetry,
        %{
          # PubSub for internal messages
          id: Codebattle.PubSub,
          start: {Phoenix.PubSub.Supervisor, :start_link, [[name: Codebattle.PubSub]]}
        },
        %{
          # PubSub for web phoenix channels
          id: CodebattleWeb.PubSub,
          start: {Phoenix.PubSub.Supervisor, :start_link, [[name: CodebattleWeb.PubSub]]}
        },
        {CodebattleWeb.Presence, []},
        {CodebattleWeb.Endpoint, []},
        {Codebattle.Game.TasksQueuesServer, []},
        {Codebattle.Game.GlobalSupervisor, []},
        {Codebattle.Tournament.GlobalSupervisor, []},
        {Codebattle.InvitesKillerServer, []},
        {Codebattle.Chat.Server, :lobby},
        {Codebattle.Bot.CreatorServer, []},
        {Codebattle.Utils.ContainerGameKiller, []},
        {Codebattle.UsersActivityServer, []},
        {Codebattle.UsersRankUpdateServer, []}
      ] ++ prod_workers

    Supervisor.start_link(children, strategy: :one_for_one, name: Codebattle.Supervisor)
  end

  def config_change(changed, _new, removed) do
    CodebattleWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
