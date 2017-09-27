defmodule Codebattle.IntegrationCase do
  @moduledoc false

  use ExUnit.CaseTemplate

  using do
    quote do
      use CodebattleWeb.ConnCase
      use Phoenix.ChannelTest
      use PhoenixIntegration

      import Ecto
      import Ecto.Query
      import CodebattleWeb.Router.Helpers
      import Helpers.GameProcess
      import Codebattle.IntegrationCase

      alias Codebattle.{Repo, User, Game, UserGame}
    end
  end
end

