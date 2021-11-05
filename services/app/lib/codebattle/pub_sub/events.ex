defmodule Codebattle.PubSub.Events do
  alias Codebattle.PubSub.Message

  def get_event("tournament:created", params) do
    %Message{
      topic: "tournaments",
      event: "tournament:created",
      payload: %{tournament: params.tournament}
    }
  end

  def get_event("tournament:finished", params) do
    %Message{
      topic: "tournaments",
      event: "tournament:finished",
      payload: %{tournament: params.tournament}
    }
  end

  def get_event("tournament:updated", params) do
    %Message{
      topic: "tournament:#{params.tournament.id}",
      event: "tournament:updated",
      payload: %{tournament: params.tournament}
    }
  end

  def get_event("game:finished", params) do
    %Message{
      topic: "main",
      event: "game:finished",
      payload: %{
        game: params.game,
        winner: params.winner,
        loser: params.loser
      }
    }
  end
end
