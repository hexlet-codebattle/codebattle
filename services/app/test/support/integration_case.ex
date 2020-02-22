defmodule Codebattle.IntegrationCase do
  @moduledoc false

  use ExUnit.CaseTemplate

  using do
    quote do
      use Phoenix.ChannelTest
      import CodebattleWeb.Router.Helpers
      import CodebattleWeb.Factory
      use Phoenix.ConnTest
      use CodebattleWeb.ConnCase
      use PhoenixIntegration

      import Helpers.GameProcess

      alias Codebattle.{Repo, User, Game, UserGame}
      alias Codebattle.GameProcess.FsmHelpers
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
