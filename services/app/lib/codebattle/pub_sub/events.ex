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

  def get_messages(event = "chat:new_msg", params) do
    [
      %Message{
        topic: chat_topic(params.chat_type),
        event: event,
        payload: params.message
      }
    ]
  end

  def get_messages(event = "chat:user_banned", params) do
    [
      %Message{
        topic: chat_topic(params.chat_type),
        event: event,
        payload: params.payload
      }
    ]
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

  defp chat_topic(:lobby), do: "chat:lobby"
  defp chat_topic({:tournament, id}), do: "chat:tournament:#{id}"
  defp chat_topic({:game, id}), do: "chat:game:#{id}"
end
