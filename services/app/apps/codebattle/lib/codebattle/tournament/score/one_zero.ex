defmodule Codebattle.Tournament.Score.OneZero do
  @moduledoc false

  @loss_score 0
  @game_level_score %{
    "elementary" => 1,
    "easy" => 1,
    "medium" => 1,
    "hard" => 1
  }

  def get_score(task_level, tests_percent) do
    if tests_percent == 100.0 do
      @game_level_score[task_level]
    else
      @loss_score
    end
  end

  def game_level_score, do: @game_level_score
  def game_level_score(level), do: Map.get(@game_level_score, level, 0)
  def loss_score, do: @loss_score
end
