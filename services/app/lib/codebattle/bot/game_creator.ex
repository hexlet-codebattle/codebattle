defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.Game.Context

  def call(level) do
    games = Context.get_live_games(%{type: "bot", state: "waiting_opponent", level: level})

    if Enum.count(games) < 1 do
      bot = Codebattle.Bot.Builder.build()

      Context.create_game(%{
        creator: bot,
        state: "waiting_opponent",
        type: "bot",
        visibility_type: "public",
        level: level,
        users: [bot]
      })
    else
      {:error, :game_limit}
    end
  end
end
