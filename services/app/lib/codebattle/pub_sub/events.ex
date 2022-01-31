defmodule Codebattle.PubSub.Events do
  alias Codebattle.PubSub.Message
  alias Codebattle.Game

  def get_messages("tournament:created", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:created",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:finished", params) do
    [
      %Message{
        topic: "tournaments",
        event: "tournament:finished",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:updated", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:updated",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("tournament:round_created", params) do
    [
      %Message{
        topic: "tournament:#{params.tournament.id}",
        event: "tournament:round_created",
        payload: %{tournament: params.tournament}
      }
    ]
  end

  def get_messages("chat:new_msg", params) do
    case params.type do
      :lobby ->
        [
          %Message{
            topic: "chat:lobby",
            event: "chat:new_msg",
            payload: params
          }
        ]

      {:tournament, id} ->
        [
          %Message{
            topic: "chat:tournament:#{id}",
            event: "chat:new_msg",
            payload: params
          }
        ]

      {:game, id} ->
        [
          %Message{
            topic: "chat:game:#{id}",
            event: "chat:new_msg",
            payload: params
          }
        ]
    end
  end

  def get_messages("game:finished", params) do
    game_events = [
      %Message{
        topic: "game:#{params.game.id}",
        event: "game:finished",
        payload: %{game: params.game}
      },
      %Message{
        topic: "games",
        event: "game:finished",
        payload: %{game: params.game}
      }
    ]

    tournament_events =
      if params.game.tournament_id do
        [
          %Message{
            topic: "game:tournament:#{params.game.tournament_id}",
            event: "game:tournament:finished",
            payload: %{
              game_id: params.game.id,
              game_state: params.game.state,
              player_results: Game.Helpers.get_player_results(params.game)
            }
          }
        ]
      else
        []
      end

    game_events ++ tournament_events
  end
end
