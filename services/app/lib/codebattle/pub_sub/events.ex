defmodule Codebattle.PubSub.Events do
  alias Codebattle.PubSub.Message

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

  def get_messages("game:finished", params) do
    [
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
  end
end
