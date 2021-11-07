defmodule CodebattleWeb.Notifications do
  alias Codebattle.Game.Play
  alias Codebattle.Game.Fsm
  alias CodebattleWeb.Api.GameView

  import CodebattleWeb.Gettext
  import Codebattle.Game.GameHelpers

  def game_timeout(game_id) do
    Task.start(fn ->
      CodebattleWeb.Endpoint.broadcast!(game_channel_name(game_id), "game:timeout", %{
        status: "timeout",
        msg: gettext("The time is out! Both players lost ;(")
      })
    end)
  end

  def remove_active_game(game_id) do
    CodebattleWeb.Endpoint.broadcast("lobby", "game:remove", %{id: game_id})
  end

  def broadcast_join_game(fsm) do
    CodebattleWeb.Endpoint.broadcast!(
      game_channel_name(fsm),
      "game:user_joined",
      GameView.render_fsm(fsm)
    )
  end

  def notify_tournament(event_type, fsm, params) do
    tournament_id = get_tournament_id(fsm)

    if tournament_id do
      Codebattle.Tournament.Server.update_tournament(tournament_id, event_type, params)
    end
  end

  defp game_channel_name(nil), do: :error
  defp game_channel_name(%Fsm{} = fsm), do: fsm |> get_game_id |> game_channel_name
  defp game_channel_name(game_id), do: "game:#{game_id}"
end
