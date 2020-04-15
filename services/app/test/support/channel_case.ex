defmodule CodebattleWeb.ChannelCase do
  @moduledoc """
  This module defines the test case to be used by
  channel tests.

  Such tests rely on `Phoenix.ChannelTest` and also
  import other functionality to make it easier
  to build and query models.

  Finally, if the test case interacts with the database,
  it cannot be async. For this reason, every test runs
  inside a transaction which is reset at the beginning
  of the test unless the test case is marked as async.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # Import conveniences for testing with channels
      use Phoenix.ChannelTest
      import CodebattleWeb.Factory
      import Helpers.GameProcess
      alias CodebattleWeb.Router.Helpers, as: Routes
      alias Codebattle.{Repo, User, Game, UserGame}

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

    :ok
  end
end
