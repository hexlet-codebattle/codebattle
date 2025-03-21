defmodule Codebattle.IntegrationCase do
  @moduledoc false

  use ExUnit.CaseTemplate

  using do
    quote do
      use CodebattleWeb.ConnCase
      use PhoenixIntegration

      import CodebattleWeb.Factory
      import CodebattleWeb.Router.Helpers
      import Phoenix.ChannelTest
      import Phoenix.ConnTest
      import Plug.Conn

      alias Codebattle.Game
      alias Codebattle.Game.Helpers
      alias Codebattle.Repo
      alias Codebattle.User
      alias Codebattle.UserGame
      alias CodebattleWeb.GameChannel
      alias CodebattleWeb.LobbyChannel
      alias CodebattleWeb.Router.Helpers, as: Routes
      alias CodebattleWeb.TournamentAdminChannel
      alias CodebattleWeb.TournamentChannel
      alias CodebattleWeb.UserSocket

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

      def game_id_from_conn(conn) do
        location =
          conn.resp_headers
          |> Enum.find(&match?({"location", _}, &1))
          |> elem(1)

        ~r/\d+/
        |> Regex.run(location)
        |> List.first()
        |> String.to_integer()
      end
    end
  end
end
