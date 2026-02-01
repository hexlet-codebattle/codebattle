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
      langs: get_langs_with_templates(game),
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
      task: render_task(game),
      duration_sec: Map.get(game, :duration_sec),
      finishes_at: Map.get(game, :finishes_at),
      timeout_seconds: game.timeout_seconds,
      tournament_id: Map.get(game, :tournament_id),
      type: game.type,
      use_chat: game.use_chat,
      use_timer: game.use_timer,
      visibility_type: game.visibility_type
    }
  end

  def render_task(%{task_type: "sql"} = game), do: game.sql_task
  def render_task(%{task_type: "css"} = game), do: game.css_task
  def render_task(game), do: game.task

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
        :creator,
        :id,
        :is_bot,
        :is_guest,
        :name,
        :rank,
        :rating,
        :rating_diff,
        :result
      ])
      |> Map.put(:lang, player.editor_lang)
    end)
  end

  def get_langs_with_templates(nil), do: []

  def get_langs_with_templates(%{css_task: %{}}) do
    [
      %{
        slug: "css",
        name: "css",
        version: "3",
        solution_template: "body {\n\tbackground-color: #F3AC3C;\n}"
      },
      %{
        slug: "sass",
        name: "scss",
        version: "1.79.4",
        solution_template: "body {\n\tbackground-color: #F3AC3C;\n}"
      },
      %{
        slug: "less",
        name: "less",
        version: "4.2.0",
        solution_template: "body {\n\tbackground-color: #F3AC3C;\n}"
      },
      %{
        slug: "stylus",
        name: "stylus",
        version: "0.63.0",
        solution_template: "body\n\tbackground-color #F3AC3C"
      }
    ]
  end

  def get_langs_with_templates(%{sql_task: %{}}) do
    [
      %{
        slug: "postgresql",
        name: "postgresql",
        version: "18",
        solution_template: "SELECT solution FROM Solution;"
      },
      %{
        slug: "mongodb",
        name: "mongodb",
        version: "8.0",
        solution_template: "db.solution.find();"
      },
      %{
        slug: "mysql",
        name: "mysql",
        version: "8.4.6",
        solution_template: "SELECT solution FROM Solution;"
      }
    ]
  end

  def get_langs_with_templates(game) when is_nil(game.task) and is_nil(game.sql_task) and is_nil(game.css_task), do: []

  def get_langs_with_templates(game) do
    Languages.meta()
    |> Map.take(Languages.get_lang_slugs())
    |> Map.values()
    |> Enum.map(fn meta ->
      %{
        slug: meta.slug,
        name: meta.name,
        version: meta.version,
        solution_template: CodeCheck.generate_solution_template(game.task, meta),
        arguments_generator_template: Map.get(meta, :arguments_generator_template, "")
      }
    end)
  end
end
