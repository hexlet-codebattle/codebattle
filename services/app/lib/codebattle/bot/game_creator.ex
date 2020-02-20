defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.GameProcess.Play

  import Ecto.Query, warn: false

  def call(level) do
    games = Play.get_active_games(%{is_bot: true, state: :waiting_opponent, level: level})

    if Enum.count(games) < 1 do
      bot = Codebattle.Bot.Builder.build()

      case Play.create_game(%{user: bot, level: level, type: "bot"}) do
        {:ok, fsm} -> {:ok, fsm, bot}
        {:error, reason} -> {:error, reason}
      end
    else
      {:error, :game_limit}
    end
  end
end
