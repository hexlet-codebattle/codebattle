defmodule Codebattle.IntegrationCase do
  @moduledoc false

  use ExUnit.CaseTemplate

  using do
    quote do
      alias CodebattleWeb.Router.Helpers, as: Routes
      import Phoenix.ChannelTest
      import CodebattleWeb.Router.Helpers
      import CodebattleWeb.Factory
      import Plug.Conn
      import Phoenix.ConnTest
      use CodebattleWeb.ConnCase
      use PhoenixIntegration

      import Helpers.Game

      alias Codebattle.{Repo, User, Game, UserGame}
      alias Codebattle.Game.Helpers
      alias CodebattleWeb.GameChannel

      @endpoint CodebattleWeb.Endpoint

      def assert_code_check do
        timeout = Application.fetch_env!(:codebattle, :code_check_timeout)

        receive do
          %Phoenix.Socket.Broadcast{event: "user:check_complete"} ->
            true
        after
          timeout ->
            flunk("Code checks is too long, more than #{timeout} ms")
        end
      end
    end
  end
end
