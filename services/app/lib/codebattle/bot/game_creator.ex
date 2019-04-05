defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.GameProcess.Play
  alias Codebattle.Repo
  alias Codebattle.Bot.Playbook

  import Ecto.Query, warn: false

  def call(level) do
    if Play.active_games() |> Enum.count() < 5 do
      bot = Codebattle.Bot.Builder.build()

      IO.puts "AUTO CREATE BOT ------------------------------------------------------------------------"
      IO.inspect bot
      case Play.create_bot_game(bot, %{"level" => level, "type" => "public"}) do
        {:ok, game_id} ->
          {:ok, game_id, bot}

        {:error, reason} ->
          {:error, reason}
      end
    else
      {:error, :game_limit}
    end
  end
end
