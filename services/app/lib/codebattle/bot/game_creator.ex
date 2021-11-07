defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.Game.Play

  import Ecto.Query, warn: false

  def call(level) do
    games = Play.get_active_games(%{is_bot: true, state: :waiting_opponent, level: level})

    if Enum.count(games) < 1 do
      Play.create_game(%{level: level, type: "bot"})
    else
      {:error, :game_limit}
    end
  end
end
