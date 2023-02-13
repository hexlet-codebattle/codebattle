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

      alias Codebattle.{Repo, User, Game, UserGame}
    end
  end

  setup tags do
    :ok = Sandbox.checkout(Repo)

    unless tags[:async] do
      Sandbox.mode(Repo, {:shared, self()})
    end

    :ok
  end
end
