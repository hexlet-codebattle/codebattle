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
      # Import conveniences for testing with connections
      use Phoenix.ConnTest


      import Phoenix.LiveViewTest
      import CodebattleWeb.Factory
      import Helpers.GameProcess
      alias Codebattle.{Repo, User, Game, UserGame}
      alias Codebattle.GameProcess.{Player}
      alias CodebattleWeb.Router.Helpers, as: Routes

      # The default endpoint for testing
      @endpoint CodebattleWeb.Endpoint
    end
  end

  setup tags do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Codebattle.Repo)
    # Clean ETS storage between tests
    :ets.delete_all_objects(:active_games)

    unless tags[:async] do
      Ecto.Adapters.SQL.Sandbox.mode(Codebattle.Repo, {:shared, self()})
    end

    conn =
      Phoenix.ConnTest.build_conn()
      |> Plug.Session.call(@session)
      |> Plug.Conn.fetch_session()

    {:ok, conn: conn}
  end
end
