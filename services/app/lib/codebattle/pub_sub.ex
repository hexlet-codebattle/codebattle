defmodule Codebattle.PubSub do
  alias Codebattle.PubSub.Events
  alias Codebattle.PubSub.Message

  defmodule Message do
    @moduledoc """
    Defines a message sent from pubsub to channels and vice-versa.

    The message format requires the following keys:

      * `:topic` - The string topic or topic:subtopic pair namespace, for example "messages", "messages:123"
      * `:event`- The string event name, for example "phx_join"
      * `:payload` - The message payload

    """

    @type t :: %Codebattle.PubSub.Message{}
    defstruct topic: nil, event: nil, payload: nil
  end

  def broadcast(event_name, params) do
    %Message{topic: topic} = message = Events.get_event(event_name, params)
    Phoenix.PubSub.broadcast(Codebattle.PubSub, topic, message)
  end

  def broadcast_from(from, event_name, params) do
    %Message{topic: topic} = message = Events.get_event(event_name, params)
    Phoenix.PubSub.broadcast_from(Codebattle.PubSub, from, topic, message)
  end

  def subscribe(topic) do
    Phoenix.PubSub.subscribe(Codebattle.PubSub, topic)
  end
end
