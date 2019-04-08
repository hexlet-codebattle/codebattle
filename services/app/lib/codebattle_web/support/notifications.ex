defmodule CodebattleWeb.Notifications do
  @moduledoc false

  require Logger

  import CodebattleWeb.Gettext

  alias CodebattleWeb.{Utils}

  def game_timeout(game_id) do
    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast!(
        Utils.game_channel_name(game_id), "game:timeout", %{ status: "timeout", msg: gettext("Oh no, the time is out! Both players lost ;(") })
    end)
  end
end
