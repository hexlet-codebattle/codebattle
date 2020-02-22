defmodule CodebattleWeb.Notifications do
  alias Codebattle.GameProcess.Play
  alias Codebattle.GameProcess.Fsm
  alias CodebattleWeb.Api.GameView

  import CodebattleWeb.Gettext
  import Codebattle.GameProcess.FsmHelpers

  def game_timeout(game_id) do
    Task.start(fn ->
      CodebattleWeb.Endpoint.broadcast!(game_channel_name(game_id), "game:timeout", %{
        status: "timeout",
        msg: gettext("Oh no, the time is out! Both players lost ;(")
      })
    end)
  end

  def remove_active_game(game_id) do
    CodebattleWeb.Endpoint.broadcast("lobby", "game:remove", %{id: game_id})
  end

  def finish_active_game(fsm) do
    game = Play.get_game(get_game_id(fsm))

    CodebattleWeb.Endpoint.broadcast("lobby", "game:finish", %{
      game: GameView.render_completed_game(game)
    })
  end

  def broadcast_join_game(fsm) do
    CodebattleWeb.Endpoint.broadcast!(
      game_channel_name(fsm),
      "user:joined",
      GameView.render_fsm(fsm)
    )
  end

  def notify_tournament(event_type, fsm, params) do
    case get_tournament_id(fsm) do
      nil ->
        nil

      tournament_id ->
        Codebattle.Tournament.Server.update_tournament(tournament_id, event_type, params)
    end
  end

  defp game_channel_name(nil), do: :error
  defp game_channel_name(%Fsm{} = fsm), do: fsm |> get_game_id |> game_channel_name
  defp game_channel_name(game_id), do: "game:#{game_id}"
end
