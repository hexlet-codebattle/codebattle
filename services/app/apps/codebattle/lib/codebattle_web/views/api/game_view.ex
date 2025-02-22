defmodule CodebattleWeb.Api.GameView do
  use CodebattleWeb, :view

  import Codebattle.Game.Helpers

  alias Codebattle.CodeCheck
  alias Runner.Languages

  def render_game(game, score) do
    %{
      id: get_game_id(game),
      inserted_at: Map.get(game, :inserted_at),
      award: game.award,
      langs: get_langs_with_templates(game.task),
      level: game.level,
      locked: game.locked,
      mode: game.mode,
      players: game.players,
      rematch_initiator_id: Map.get(game, :rematch_initiator_id),
      rematch_state: Map.get(game, :rematch_state, "none"),
      score: score,
      starts_at: Map.get(game, :starts_at),
      state: game.state,
      status: game.state,
      task: game.task,
      timeout_seconds: game.timeout_seconds,
      tournament_id: Map.get(game, :tournament_id),
      type: game.type,
      waiting_room_name: game.waiting_room_name,
      use_chat: game.use_chat,
      use_timer: game.use_timer,
      visibility_type: game.visibility_type
    }
  end

  def render_completed_games(games) do
    Enum.map(games, &render_completed_game/1)
  end

  def render_completed_game(game) do
    %{
      id: game.id,
      players: render_players(game),
      finishes_at: game.finishes_at,
      duration: game.duration_sec || game.timeout_seconds,
      level: game.level
    }
  end

  # defp get_duration(%{starts_at: nil}), do: 100
  # defp get_duration(%{finishes_at: nil}), do: 100

  # defp get_duration(%{starts_at: starts_at, finishes_at: finishes_at}) do
  #   NaiveDateTime.diff(finishes_at, starts_at)
  # end

  defp render_players(game) do
    game
    |> Map.get(:players, [])
    |> Enum.sort(&(&1.creator > &2.creator))
    |> Enum.map(fn player ->
      player
      |> Map.take([
        :id,
        :is_bot,
        :is_guest,
        :name,
        :rank,
        :rating,
        :rating_diff,
        :result,
        :creator
      ])
      |> Map.put(:lang, player.editor_lang)
    end)
  end

  def get_langs_with_templates(task) do
    Languages.meta()
    |> Map.values()
    |> Enum.map(fn meta ->
      %{
        slug: meta.slug,
        name: meta.name,
        version: meta.version,
        solution_template: CodeCheck.generate_solution_template(task, meta),
        arguments_generator_template: Map.get(meta, :arguments_generator_template, "")
      }
    end)
  end
end
