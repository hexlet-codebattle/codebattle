defmodule CodebattleWeb.Presence do
  use Phoenix.Presence,
    otp_app: :codebattle,
    pubsub_server: :cb_pubsub
end
