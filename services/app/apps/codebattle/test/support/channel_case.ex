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
      import CodebattleWeb.Factory
      # Import conveniences for testing with channels
      import Phoenix.ChannelTest

      alias Codebattle.Game
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
    :ok
  end
end
