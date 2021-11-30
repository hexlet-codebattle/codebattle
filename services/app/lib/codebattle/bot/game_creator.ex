defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.Game

  def call(level) do
    games = Game.Context.get_live_games(%{type: "bot", state: "waiting_opponent", level: level})

    if Enum.count(games) < 1 do
      bot = Codebattle.Bot.Builder.build()

      Game.Context.create_game(%{
        state: "waiting_opponent",
        type: "bot",
        visibility_type: "public",
        level: level,
        players: [bot]
      })
    else
      {:error, :game_limit}
    end
  end
end
