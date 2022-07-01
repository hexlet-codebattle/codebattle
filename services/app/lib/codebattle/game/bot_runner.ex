# defmodule Codebattle.Game.BotRunner do
#   alias Codebattle.Bot
#   alias Codebattle.Game.Helpers

#   def call(game) do
#     Bot.Supervisor.start_bot(%{
#       game_id: game.id,
#       game_type: game.type,
#       task_id: game.task.id,
#       bot_id: Helpers.get_bot(game).id,
      # bot_time_ms: get_bot_time(game)
#     })
#   end

# end
