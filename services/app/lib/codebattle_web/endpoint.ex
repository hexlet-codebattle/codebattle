defmodule CodebattleWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :codebattle

  @session_options [
    store: :cookie,
    key: "_codebattle_key",
    signing_salt: "7k9BuL99"
  ]

  socket("/ws", CodebattleWeb.UserSocket, websocket: [timeout: :infinity])
  socket("/extension", CodebattleWeb.ExtensionSocket, websocket: [timeout: :infinity], check_origin: false)
  socket("/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]])

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
  plug(Plug.Logger)

  plug(
    Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(Plug.MethodOverride)
  plug(Plug.Head)

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  plug(
    Plug.Session,
    @session_options
  )

  plug(PhoenixGon.Pipeline)
  plug(CodebattleWeb.Router)

  def init(_key, config) do
    {:ok, config}
  end
end
