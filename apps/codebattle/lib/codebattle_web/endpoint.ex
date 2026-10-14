defmodule CodebattleWeb.Endpoint do
  use Sentry.PlugCapture
  use Phoenix.Endpoint, otp_app: :codebattle

  @default_session_options [
    store: :cookie,
    key: "_codebattle_key",
    signing_salt: "7k9BuL99",
    same_site: "Lax",
    http_only: true,
    secure: false,
    max_age: 31_536_000
  ]

  def session_options do
    :codebattle
    |> Application.get_env(__MODULE__, [])
    |> Keyword.get(:session_options, @default_session_options)
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
  end

  socket("/ws", CodebattleWeb.UserSocket, websocket: [timeout: :infinity, compress: true])

  socket("/ws-streamer", CodebattleWeb.StreamerSocket, websocket: [timeout: :infinity, compress: true])

  socket("/live", Phoenix.LiveView.Socket,
    websocket: [
      connect_info: [
        :peer_data,
        :trace_context_headers,
        :x_headers,
        :uri,
        session: {__MODULE__, :session_options, []}
      ]
    ]
  )

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phoenix.digest
  # when deploying your static files in production.
  plug(
    Plug.Static,
    at: "/",
    from: :codebattle,
    gzip: false,
    only: ~w(assets css fonts images js favicon.ico robots.txt offline.html service-worker.js)
  )

  # Development serves the static files (images, audio, fonts, favicons) straight from
  # apps/codebattle/static, at the same /assets/* paths production copies them to
  # (priv/static/assets, see Containerfile.codebattle). The app bundle itself comes
  # from the frontend's Vite dev server (CodebattleWeb.Frontend).
  if Mix.env() == :dev do
    plug(
      Plug.Static,
      at: "/assets",
      from: Path.expand("../../static", __DIR__),
      gzip: false
    )

    plug(
      Plug.Static,
      at: "/",
      from: Path.expand("../../static", __DIR__),
      gzip: false,
      only: ~w(offline.html service-worker.js)
    )
  end

  if Code.ensure_loaded?(Tidewave) do
    plug(Tidewave)
  end

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket("/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket)
    plug(Phoenix.LiveReloader)
    plug(Phoenix.CodeReloader)
    plug(Phoenix.Ecto.CheckRepoStatus, otp_app: :codebattle)
  end

  plug(Phoenix.LiveDashboard.RequestLogger,
    param_key: "request_logger",
    cookie_key: "request_logger"
  )

  plug(Plug.RequestId)
  plug(Plug.Telemetry, event_prefix: [:phoenix, :endpoint])

  plug(
    Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(Sentry.PlugContext)

  plug(Plug.MethodOverride)
  plug(Plug.Head)

  plug(CodebattleWeb.Plugs.Session)

  plug(CodebattleWeb.Router)
end
