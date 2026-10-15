defmodule Codebattle.PubSub do
  @moduledoc false
  alias Codebattle.PubSub.Events
  alias Codebattle.PubSub.Message
  alias Codebattle.PubSub.UserEvents

  require Logger

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
    Logger.debug("Event Broadcast: #{event_name}")

    result =
      event_name
      |> Events.get_messages(params)
      |> Enum.map(fn %{topic: topic} = message ->
        Phoenix.PubSub.broadcast(Codebattle.PubSub, topic, message)
      end)

    broadcast_user_events(event_name, params)
    result
  end

  # Per-user copies for the public API event stream; never break the domain broadcast.
  defp broadcast_user_events(event_name, params) do
    event_name
    |> UserEvents.messages(params)
    |> Enum.each(fn %{topic: topic} = message -> Phoenix.PubSub.broadcast(Codebattle.PubSub, topic, message) end)
  rescue
    error -> Logger.error("User events for #{event_name} failed: #{Exception.message(error)}")
  end

  def broadcast_from(from, event_name, params) do
    Logger.debug("Event BroadcastFrom: #{from}, #{event_name}")

    event_name
    |> Events.get_messages(params)
    |> Enum.map(fn %{topic: topic} = message ->
      Phoenix.PubSub.broadcast_from(Codebattle.PubSub, from, topic, message)
    end)
  end

  def subscribe(topic) do
    Phoenix.PubSub.subscribe(Codebattle.PubSub, topic)
  end

  def unsubscribe(topic) do
    Phoenix.PubSub.unsubscribe(Codebattle.PubSub, topic)
  end
end
