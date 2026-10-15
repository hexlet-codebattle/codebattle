defmodule CodebattleWeb.Presence do
  @moduledoc false
  use Phoenix.Presence,
    otp_app: :codebattle,
    pubsub_server: CodebattleWeb.PubSub
end
