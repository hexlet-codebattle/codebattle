defmodule Codebattle.Tournament.Score.WinLoss do
  @moduledoc false

  @loss_score 1
  @game_level_score %{
    "elementary" => 2,
    "easy" => 3,
    "medium" => 5,
    "hard" => 8
  }

  def get_score(task_level, tests_percent) do
    if tests_percent == 100.0 do
      @game_level_score[task_level]
    else
      @loss_score
    end
  end

  def game_level_score, do: @game_level_score
  def game_level_score(level), do: Map.get(@game_level_score, level, "0")
  def loss_score, do: @loss_score
end
