defmodule Codebattle.Application do
  @moduledoc false
  use Application

  @app_dir File.cwd!()

  @impl true
  def start(_type, _args) do
    if Application.get_env(:codebattle, :load_dot_env_file) do
      root_dir = @app_dir |> Path.join("../../../../") |> Path.expand()
      config_path = Keyword.get(Mix.Project.config(), :config_path)
      env_path = Path.join(root_dir, ".env")

      Envy.load([env_path])
      config_path |> Config.Reader.read!() |> Application.put_all_env()
    end

    children =
      [
        {ChromicPDF, chromic_pdf_opts()},
        {Cachex, name: :season_cache},
        {Codebattle.UsersPointsAndRankServer, []},
        {Codebattle.UserAchievementsServer, []},
        {Codebattle.Bot.GameCreator, []},
        {Codebattle.Tournament.UpcomingRunner, []},
        {Codebattle.ImageCache, []},
        {Codebattle.Repo, []},
        {Registry, keys: :unique, name: Codebattle.Registry},
        CodebattleWeb.Telemetry,
        %{id: Codebattle.PubSub, start: {Phoenix.PubSub.Supervisor, :start_link, [[name: Codebattle.PubSub]]}},
        %{id: CodebattleWeb.PubSub, start: {Phoenix.PubSub.Supervisor, :start_link, [[name: CodebattleWeb.PubSub]]}},
        {CodebattleWeb.Presence, []},
        {Finch, name: CodebattleHTTP, pools: %{default: [size: 300, count: 5]}},
        {Codebattle.Game.TasksQueuesServer, []},
        {Codebattle.Game.GlobalSupervisor, []},
        {Codebattle.Tournament.GlobalSupervisor, []},
        {Codebattle.InvitesKillerServer, []},
        %{id: Codebattle.Chat.Lobby, start: {Codebattle.Chat, :start_link, [:lobby, %{message_ttl: to_timeout(hour: 8)}]}}
      ] ++ [{CodebattleWeb.Endpoint, []}]

    # PubSub for internal messages
    # PubSub for web phoenix channels
    # TODO: move bot endpoint to main endpoint
    # {CodebattleWeb.BotEndpoint, []},
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

  @chromic_pdf_opts Application.compile_env!(:codebattle, ChromicPDF)
  # in milliseconds
  defp chromic_pdf_opts do
    @chromic_pdf_opts ++
      [
        chrome_args: [append: "--disable-gpu --font-render-hinting=none"],
        discard_stderr: false,
        no_sandbox: true,
        session_pool: [
          size: 1,
          timeout: 30_000,
          checkout_timeout: 30_000
        ]
      ]
  end
end
