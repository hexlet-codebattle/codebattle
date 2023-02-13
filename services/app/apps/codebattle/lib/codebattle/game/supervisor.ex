defmodule Codebattle.Game.Supervisor do
  require Logger

  use Supervisor

  alias Codebattle.Game
  alias Codebattle.Bot

  def start_link(game) do
    Supervisor.start_link(__MODULE__, game, name: supervisor_name(game.id))
  end

  def init(game) do
    children = [
      {Game.Server, game},
      {Game.TimeoutServer, game.id},
      {Bot.Supervisor, game.id}
    ]

    chat =
      case game.tournament_id do
        nil ->
          [
            %{
              id: "Codebattle.Chat.Game.#{game.id}",
              start: {Codebattle.Chat, :start_link, [{:game, game.id}, %{}]}
            }
          ]

        _ ->
          []
      end

    Supervisor.init(children ++ chat, strategy: :one_for_one)
  end

  defp supervisor_name(game_id),
    do: {:via, Registry, {Codebattle.Registry, "game_sup:#{game_id}"}}
end
