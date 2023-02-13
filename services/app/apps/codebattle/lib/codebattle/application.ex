defmodule Codebattle.Application do
  @moduledoc false
  use Application

  def start(_type, _args) do
    if Application.get_env(:codebattle, :load_dot_env_file) do
      Envy.load(["../../.env"])
      Envy.reload_config()
    end

    prod_workers =
      if Application.get_env(:codebattle, :use_prod_workers) do
        [{Codebattle.TasksImporter, []}]
      else
        []
      end

    non_test_workers =
      if Application.get_env(:codebattle, :use_non_test_workers) do
        [
          {Codebattle.Bot.GameCreator, []},
          {Codebattle.UsersRankUpdateServer, []}
        ]
      else
        []
      end

    children =
      [
        {Codebattle.Repo, []},
        {Registry, keys: :unique, name: Codebattle.Registry},
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
        %{
          id: Codebattle.Chat.Lobby,
          start: {Codebattle.Chat, :start_link, [:lobby, %{message_ttl: :timer.hours(8)}]}
        }
      ] ++ prod_workers ++ non_test_workers

    Supervisor.start_link(children,
      strategy: :one_for_one,
      name: Codebattle.Supervisor,
      max_restarts: 13_579,
      max_seconds: 11
    )
  end

  def config_change(changed, _new, removed) do
    CodebattleWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
