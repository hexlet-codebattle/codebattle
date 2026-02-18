defmodule CodebattleWeb.Endpoint do
  use Sentry.PlugCapture
  use Phoenix.Endpoint, otp_app: :codebattle

  @session_options [
    store: :cookie,
    key: "_codebattle_key",
    signing_salt: "7k9BuL99"
  ]

  socket("/ws", CodebattleWeb.UserSocket, websocket: [timeout: :infinity, compress: true])

  socket("/live", Phoenix.LiveView.Socket,
    websocket: [
      connect_info: [
        :peer_data,
        :trace_context_headers,
        :x_headers,
        :uri,
        session: @session_options
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
    only: ~w(assets css fonts images js favicon.ico robots.txt)
  )

  # Serve static files (images, fonts, audio) from assets/static in development
  # Served at both /assets/* and /assets/static/* to support both:
  # - Template usage: /assets/images/logo.svg
  # - JS imports in dev: /assets/static/images/logo.svg (Vite returns this in dev)
  if Mix.env() == :dev do
    # Serve node_modules in dev so Monaco ESM runtime paths can be fetched from
    # the same origin as Phoenix (avoids cross-origin Worker restrictions).
    plug(
      Plug.Static,
      at: "/node_modules",
      from: Path.expand("../../node_modules", __DIR__),
      gzip: false
    )

    # Serve local Monaco worker entry files in dev from Phoenix origin.
    plug(
      Plug.Static,
      at: "/assets/js/monaco-workers",
      from: Path.expand("../../assets/js/monaco-workers", __DIR__),
      gzip: false
    )

    plug(
      Plug.Static,
      at: "/assets/static",
      from: Path.expand("../../assets/static", __DIR__),
      gzip: false
    )

    plug(
      Plug.Static,
      at: "/assets",
      from: Path.expand("../../assets/static", __DIR__),
      gzip: false
    )

    # Serve fonts and codicon.ttf at root level for KaTeX and Monaco in dev
    plug(
      Plug.Static,
      at: "/fonts",
      from: Path.expand("../../assets/static/fonts", __DIR__),
      gzip: false
    )

    plug(
      Plug.Static,
      at: "/",
      from: Path.expand("../../assets/static", __DIR__),
      gzip: false,
      only: ~w(codicon.ttf)
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

  plug(Plug.Session, @session_options)

  plug(CodebattleWeb.Router)
end
