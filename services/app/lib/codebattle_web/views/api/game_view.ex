defmodule CodebattleWeb.Api.GameView do
  use CodebattleWeb, :view

  alias Codebattle.Game.Player
  alias Codebattle.Languages
  alias Codebattle.CodeCheck

  import Codebattle.Game.Helpers

  def render_game(game) do
    %{
      inserted_at: game.inserted_at,
      langs: get_langs_with_solution_templates(game.task),
      level: game.level,
      mode: game.mode,
      players: game.players,
      rematch_initiator_id: game.rematch_initiator_id,
      rematch_state: game.rematch_state,
      starts_at: game.starts_at,
      state: game.state,
      status: game.state,
      task: game.task,
      timeout_seconds: game.timeout_seconds,
      tournament_id: game.tournament_id,
      type: game.type,
      visibility_type: game.visibility_type
    }
  end

  def render_completed_games(games) do
    games |> Enum.filter(&(&1.mode != "training")) |> Enum.map(&render_completed_game/1)
  end

  def render_completed_game(game) do
    %{
      id: game.id,
      players: render_players(game),
      finishes_at: game.finishes_at,
      duration: get_duration(game),
      level: game.level
    }
  end

  def render_live_games(live_games, user_id) do
    Enum.filter(live_games, &can_player_receive_game?(&1, user_id))
  end

  def can_player_receive_game?(game, user_id) do
    Enum.any?(game.players, fn player -> player.id === user_id end) or
      game.visibility_type in ["public"]
  end

  def render_active_game(game) do
    %{
      id: get_game_id(game),
      state: get_state(game),
      is_bot: bot_game?(game),
      level: get_level(game),
      inserted_at: get_inserted_at(game),
      type: get_type(game),
      timeout_seconds: get_timeout_seconds(game),
      players: get_players(game)
    }
  end

  defp get_duration(%{starts_at: nil}), do: 100
  defp get_duration(%{finishes_at: nil}), do: 100

  defp get_duration(%{starts_at: starts_at, finishes_at: finishes_at}) do
    NaiveDateTime.diff(finishes_at, starts_at)
  end

  defp render_players(game) do
    game
    |> Map.get(:user_games, [])
    |> Enum.map(fn user_game -> Player.build(user_game) end)
    |> Enum.sort(&(&1.creator > &2.creator))
  end

  def get_langs_with_solution_templates(task) do
    Languages.meta()
    |> Map.values()
    |> Enum.map(fn meta ->
      meta
      |> Map.from_struct()
      |> Map.put(:solution_template, CodeCheck.generate_solution_template(meta, task))
    end)
  end
end
