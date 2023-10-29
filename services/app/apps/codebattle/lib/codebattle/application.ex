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

    github_tasks =
      if Application.get_env(:codebattle, :import_github_tasks) do
        [{Codebattle.TasksImporter, []}]
      else
        []
      end

    bot_games =
      if Application.get_env(:codebattle, :create_bot_games) do
        [{Codebattle.Bot.GameCreator, []}]
      else
        []
      end

    user_rank =
      if Application.get_env(:codebattle, :user_rank_server) do
        [{Codebattle.UsersRankUpdateServer, []}]
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
      ] ++ github_tasks ++ bot_games ++ user_rank

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
