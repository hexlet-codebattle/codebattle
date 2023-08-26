defmodule Codebattle.DataCase do
  use ExUnit.CaseTemplate

  alias Codebattle.Repo
  alias Ecto.Adapters.SQL.Sandbox

  using do
    quote do
      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import Codebattle.DataCase

      import CodebattleWeb.Factory

      alias Codebattle.Game
      alias Codebattle.Repo
      alias Codebattle.User
      alias Codebattle.UserGame
    end
  end

  setup tags do
    setup_sandbox(tags)
    :ok
  end

  @doc """
  Sets up the sandbox based on the test tags.
  """
  def setup_sandbox(tags) do
    pid = Sandbox.start_owner!(Repo, shared: not tags[:async])
    on_exit(fn -> Sandbox.stop_owner(pid) end)
  end
end
