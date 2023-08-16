defmodule Codebattle.Application do
  @moduledoc false
  use Application

  @app_dir File.cwd!()

  @impl true
  def start(_type, _args) do
    if Application.get_env(:codebattle, :load_dot_env_file) do
      root_dir = @app_dir |> Path.join("../../../../") |> Path.expand()
      config_path = Mix.Project.config() |> Keyword.get(:config_path)
      env_path = Path.join(root_dir, ".env")

      Envy.load([env_path])
      Config.Reader.read!(config_path) |> Application.put_all_env()
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

  @impl true
  def config_change(changed, _new, removed) do
    CodebattleWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
