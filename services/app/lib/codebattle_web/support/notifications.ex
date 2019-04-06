defmodule CodebattleWeb.Notifications do
  @moduledoc false

  require Logger

  alias CodebattleWeb.{Utils}

  def game_timeout(game_id) do
    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast!(
        Utils.game_channel_name(game_id), "game:timeout", %{})
    end)
  end
end
