defmodule Codebattle.Bot do
  @moduledoc "Interaction with bots"
  alias Codebattle.Bot
  alias Codebattle.Game

  @spec start_bots(Game.t()) :: :ok
  def start_bots(game) do
    bots = Game.Helpers.get_bots(game)

    [{supervisor, _}] = Registry.lookup(Codebattle.Registry, "bot_sup:#{game.id}")

    Enum.each(bots, fn bot ->
      Supervisor.start_child(
        supervisor,
        %{
          id: "bot_server_#{game.id}:#{bot.id}",
          restart: :transient,
          type: :worker,
          start: {Bot.Server, :start_link, [%{game: game, bot_id: bot.id}]}
        }
      )
    end)
  end
end
