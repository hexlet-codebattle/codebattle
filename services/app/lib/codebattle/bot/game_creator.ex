defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.GameProcess.Play
  alias Codebattle.Repo
  alias Codebattle.Bot.Playbook

  import Ecto.Query, warn: false

  def call() do
    # TODO: think about more smart solution
    if Play.active_games() |> Enum.count() < 5 do
      level = ["elementary", "easy", "medium", "hard"] |> Enum.random()
      bot = Codebattle.Bot.Builder.build()

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
