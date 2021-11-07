defmodule CodebattleWeb.Presence do
  use Phoenix.Presence,
    otp_app: :codebattle,
    pubsub_server: CodebattleWeb.PubSub
end
