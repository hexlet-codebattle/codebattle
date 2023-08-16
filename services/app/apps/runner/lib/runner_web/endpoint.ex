defmodule RunnerWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :runner
  use Sentry.PlugCapture

  @session_options [
    store: :cookie,
    key: "_runner_key",
    signing_salt: "eoSj11HL"
  ]
  plug(Plug.Static,
    at: "/",
    from: :runner,
    gzip: false,
    only: ~w(assets fonts images favicon.ico robots.txt)
  )

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    plug(Phoenix.CodeReloader)
  end

  plug(Plug.RequestId)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(Sentry.PlugContext)
  plug(Plug.MethodOverride)
  plug(Plug.Head)
  plug(Plug.Session, @session_options)
  plug(RunnerWeb.Router)
end
