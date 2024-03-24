defmodule Codebattle.Tournament.Score.TimeAndTests do
  @moduledoc false

  @game_level_score %{
    "elementary" => 30.0,
    "easy" => 100.0,
    "medium" => 300.0,
    "hard" => 1000.0
  }

  @game_level_min_time_sec %{
    "elementary" => 10.0,
    "easy" => 20.0,
    "medium" => 40.0,
    "hard" => 60.0
  }

  @game_level_max_time_sec %{
    "elementary" => 5 * 60.0,
    "easy" => 8 * 60.0,
    "medium" => 13 * 60.0,
    "hard" => 21 * 60.0
  }

  def get_score(task_level, tests_percent, duration_sec) do
    game_score = @game_level_score[task_level]
    min_time = @game_level_min_time_sec[task_level]
    max_time = @game_level_max_time_sec[task_level]

    # tests_k is linearly goes from 1 to 0.01 as test results
    tests_k =
      if tests_percent < 1.0 do
        0.01
      else
        tests_percent / 100.0
      end

    # time_k is linearly goes from 1 to 0.01 as match duration
    time_k =
      cond do
        duration_sec < min_time ->
          1

        duration_sec > max_time ->
          0.01

        true ->
          k = -0.99 / (max_time - min_time)
          b = (max_time - 0.01 * min_time) / (max_time - min_time)
          k * duration_sec + b
      end

    round(game_score * tests_k * time_k)
  end
end
