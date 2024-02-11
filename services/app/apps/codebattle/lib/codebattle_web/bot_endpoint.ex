defmodule CodebattleWeb.BotEndpoint do
  use Sentry.PlugCapture
  use Phoenix.Endpoint, otp_app: :codebattle

  socket("/chat_bot", CodebattleWeb.ChatBotSocket,
    websocket: [timeout: :infinity, check_origin: false],
    longpool: false,
    check_origin: false
  )

  plug(CodebattleWeb.Router)
end
