defmodule CodebattleWeb.Endpoint do
  use Sentry.PlugCapture
  use Phoenix.Endpoint, otp_app: :codebattle

  @session_options [
    store: :cookie,
    key: "_codebattle_key",
    signing_salt: "7k9BuL99"
  ]

  socket("/ws", CodebattleWeb.UserSocket, websocket: [timeout: :infinity])

  socket("/extension", CodebattleWeb.ExtensionSocket,
    websocket: [timeout: :infinity, check_origin: false],
    check_origin: false
  )

  socket("/discord", CodebattleWeb.DiscordSocket,
    websocket: [timeout: :infinity, check_origin: false],
    check_origin: false
  )

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
