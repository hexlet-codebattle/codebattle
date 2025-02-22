defmodule CodebattleWeb.ConnCase do
  @moduledoc """
  This module defines the test case to be used by
  tests that require setting up a connection.

  Such tests rely on `Phoenix.ConnTest` and also
  import other functionality to make it easier
  to build and query models.

  Finally, if the test case interacts with the database,
  it cannot be async. For this reason, every test runs
  inside a transaction which is reset at the beginning
  of the test unless the test case is marked as async.
  """

  use ExUnit.CaseTemplate

  @session Plug.Session.init(
             store: :cookie,
             key: "_app",
             encryption_salt: "yadayada",
             signing_salt: "yadayada"
           )

  using do
    quote do
      import Codebattle.OauthTestHelpers
      import CodebattleWeb.Factory
      import Phoenix.ConnTest
      import Phoenix.LiveViewTest
      # Import conveniences for testing with connections
      import Plug.Conn

      alias Codebattle.Game
      alias Codebattle.Game.Player
      alias Codebattle.Repo
      alias Codebattle.User
      alias Codebattle.UserGame
      alias CodebattleWeb.Router.Helpers, as: Routes

      # The default endpoint for testing
      @endpoint CodebattleWeb.Endpoint
    end
  end

  setup tags do
    Codebattle.DataCase.setup_sandbox(tags)

    conn =
      Phoenix.ConnTest.build_conn()
      |> Plug.Session.call(@session)
      |> Plug.Conn.fetch_session()

    {:ok, conn: conn}
  end
end
