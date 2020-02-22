defmodule CodebattleWeb.Api.GameView do
  use CodebattleWeb, :view

  alias Codebattle.GameProcess.Player

  import Codebattle.GameProcess.FsmHelpers

  def render_fsm(fsm) do
    %{
      status: fsm.state,
      players: get_players(fsm),
      task: get_task(fsm),
      level: get_level(fsm),
      type: get_type(fsm),
      timeout_seconds: get_timeout_seconds(fsm),
      rematch_state: get_rematch_state(fsm),
      rematch_initiator_id: get_rematch_initiator_id(fsm),
      tournament_id: get_tournament_id(fsm),
      inserted_at: get_inserted_at(fsm),
      starts_at: get_starts_at(fsm),
      langs: get_langs(fsm)
    }
  end

  def render_completed_games(games) do
    Enum.map(games, &render_completed_game/1)
  end

  def render_completed_game(game) do
    %{
      id: game.id,
      players: render_players(game),
      finishs_at: game.finishs_at,
      duration: get_duration(game),
      level: game.level
    }
  end

  def render_active_games(active_games, user_id) do
    active_games
    |> Enum.filter(&can_player_receive_game?(&1, user_id))
  end

  def can_player_receive_game?(game, user_id) do
    Enum.any?(game.players, fn player -> player.id === user_id end) or game.type != "private"
  end

  def render_active_game(fsm) do
    %{
      id: get_game_id(fsm),
      state: get_state(fsm),
      is_bot: bot_game?(fsm),
      level: get_level(fsm),
      inserted_at: get_inserted_at(fsm),
      type: get_type(fsm),
      timeout_seconds: get_timeout_seconds(fsm),
      players: get_players(fsm)
    }
  end

  defp get_duration(%{starts_at: nil}), do: 100
  defp get_duration(%{finishs_at: nil}), do: 100

  defp get_duration(%{starts_at: starts_at, finishs_at: finishs_at}) do
    NaiveDateTime.diff(finishs_at, starts_at)
  end

  defp render_players(game) do
    game
    |> Map.get(:user_games, [])
    |> Enum.map(fn user_game -> Player.build(user_game) end)
    |> Enum.sort(&(&1.creator > &2.creator))
  end
end
