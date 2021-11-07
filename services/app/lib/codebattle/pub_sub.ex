defmodule Codebattle.PubSub do
  alias Codebattle.PubSub.Events
  alias Codebattle.PubSub.Message

  defmodule Message do
    @moduledoc """
    Defines a message sent from pubsub to channels and vice-versa.

    The message format requires the following keys:

      * `:topic` - The string topic or topic:subtopic pair namespace, for example "tournaments", "tournament:37"
      * `:event`- The string event name, for example "game:canceled"
      * `:payload` - The message payload

    """
    use TypedStruct

    typedstruct enforce: true do
      field(:topic, String.t())
      field(:event, String.t())
      field(:payload, map)
    end
  end

  def broadcast(event_name, params) do
    event_name
    |> Events.get_messages(params)
    |> Enum.map(fn %{topic: topic} = message ->
      Phoenix.PubSub.broadcast(Codebattle.PubSub, topic, message)
    end)
  end

  def broadcast_from(from, event_name, params) do
    event_name
    |> Events.get_messages(params)
    |> Enum.map(fn %{topic: topic} = message ->
      Phoenix.PubSub.broadcast_from(Codebattle.PubSub, from, topic, message)
    end)
  end

  def subscribe(topic) do
    Phoenix.PubSub.subscribe(Codebattle.PubSub, topic)
  end
end
