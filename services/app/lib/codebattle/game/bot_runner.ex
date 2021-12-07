defmodule Codebattle.Game.BotRunner do
  alias Codebattle.Bot
  alias Codebattle.Game.Helpers

  def call(game) do
    Bot.PlayersSupervisor.create_player(%{
      game_id: game.id,
      game_type: game.type,
      task_id: game.task.id,
      bot_id: Helpers.get_bot(game).id,
      bot_time_ms: get_bot_time(game)
    })
  end

  defp get_bot_time(game) do
    bot =  Helpers.get_bot(game)
    player = Helpers.get_opponent(game, bot.id)
    game_level = game.level

    low_level_time = %{
      "elementary" => 60 * 5,
      "easy" => 60 * 6,
      "medium" => 60 * 7,
      "hard" => 60 * 9
    }

    high_level_time = %{
      "elementary" => 30,
      "easy" => 30 * 3,
      "medium" => 30 * 5,
      "hard" => 30 * 7
    }

    # y = f(x);
    # y: time, x: rating;
    # f(x) = k/(x  + b)

    x1 = 1400
    x2 = 800
    y1 = high_level_time[game_level]
    y2 = low_level_time[game_level]
    k = y1 * (x1 * y2 - x2 * y2) / (y2 - y1)
    b = (x1 * y1 - x2 * y2) / (y2 - y1)

    k / (player.rating + b) * 1000
  end
end
