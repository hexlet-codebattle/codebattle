defmodule Codebattle.IntegrationCase do
  @moduledoc false

  use ExUnit.CaseTemplate

  @session Plug.Session.init(
    store: :cookie,
    key: "_app",
    encryption_salt: "yadayada",
    signing_salt: "yadayada"
  )

  using do
    quote do
      use Phoenix.ChannelTest
      import CodebattleWeb.Router.Helpers
      import CodebattleWeb.Factory
      use CodebattleWeb.ConnCase
      use PhoenixIntegration

      # import Ecto
      # import Ecto.Query
      import Helpers.GameProcess
      import Helpers.TimeStorage

      alias Codebattle.{Repo, User, Game, UserGame}
      alias Codebattle.GameProcess.{FsmHelpers}
      alias CodebattleWeb.{GameChannel}

      @endpoint CodebattleWeb.Endpoint
    end
  end

  # setup tags do
    # :ok = Ecto.Adapters.SQL.Sandbox.checkout(Codebattle.Repo)
    # unless tags[:async] do
    #   Ecto.Adapters.SQL.Sandbox.mode(Codebattle.Repo, {:shared, self()})
    # end

#     conn = Phoenix.ConnTest.build_conn()
#            |> Plug.Session.call(@session)
#            |> Plug.Conn.fetch_session()
#     {:ok, conn: conn}
#   end
end

