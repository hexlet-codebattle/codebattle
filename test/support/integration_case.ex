defmodule Codebattle.IntegrationCase do
  @moduledoc false

  use ExUnit.CaseTemplate

  using do
    quote do
      use Phoenix.ChannelTest
      use CodebattleWeb.ConnCase
      use PhoenixIntegration

      import Ecto
      import Ecto.Query
      import CodebattleWeb.Router.Helpers
      import Helpers.GameProcess
      import Helpers.TimeStorage

      alias Codebattle.{Repo, User, Game, UserGame}
    end
  end
end

