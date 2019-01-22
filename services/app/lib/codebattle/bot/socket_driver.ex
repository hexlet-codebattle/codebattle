defmodule Codebattle.Bot.SocketDriver do
  @moduledoc """
    Create sockets for bots
    SEE http://theerlangelist.com/article/driving_phoenix_sockets
  """
  use GenServer
  require Logger

  alias Phoenix.ChannelTest.NoopSerializer

  def start_link(endpoint, socket_handler, opts \\ [], gen_server_opts \\ []) do
    GenServer.start_link(__MODULE__, {endpoint, socket_handler, opts}, gen_server_opts)
  end

  def join(driver, topic, payload \\ %{}), do: push(driver, topic, "phx_join", payload)

  def push(driver, topic, event, payload) do
    push(driver, %Phoenix.Socket.Message{
      event: event,
      topic: topic,
      payload: payload,
      ref: make_ref()
    })
  end

  defp push(driver, message) do
    :ok = GenServer.cast(driver, {:push, message})
    message.ref
  end

  def init({endpoint, socket_handler, driver_opts}) do
    Process.flag(:trap_exit, true)

    # Using connect to create the socket
    {:ok, socket} =
      socket_handler.connect(
        %{
        endpoint: endpoint,
        transport: __MODULE__,
        options: [serializer: [{NoopSerializer, "~> 1.0.0"}]],
        params: %{"vsn" => "1.0.0", "token" => bot_token()},
        connect_info: [:peer_data, :x_headers, :uri]}
      )

    # A socket driver needs to manage some state
    {:ok,
     %{
       # the socket struct
       socket: socket,
       # topic -> channel pid
       channels: Map.new(),
       # channel pid -> topic
       channels_inverse: Map.new(),
       receiver: driver_opts[:receiver]
     }}
  end

  def handle_cast({:push, message}, state) do
    {:noreply,
     message
     |> NoopSerializer.decode!([])
     |> Phoenix.Socket.Transport.dispatch(state.channels, state.socket)
     |> handle_socket_response(state)}
  end

  # received through PubSub when a broadcast message is fastlaned
  # The message format is governed by the serializer, in this case
  # Phoenix.ChannelTest.NoopSerializer
  def handle_info(%Phoenix.Socket.Message{} = encoded_message, state) do
    # on join another user start bot playbook
    # start_bot_cycle(diffs, game_topic, socket_pid)
    IO.inspect(111_111_111_111_111_111_111_111_111_111_111)
    IO.inspect(state)
    IO.inspect(encoded_message)
    {:noreply, send_out(state, encoded_message)}
  end

  # received from the channel process if the callback function replies
  def handle_info(%Phoenix.Socket.Reply{} = message, state),
    do: {:noreply, encode_and_send_out(state, message)}

  # channel process has terminated -> remove it from internal Maps
  def handle_info({:EXIT, pid, reason}, state) do
    case Map.get(state.channels_inverse, pid) do
      :error ->
        {:noreply, state}

      {:ok, topic} ->
        {:noreply,
         state
         |> delete_channel_process(topic, pid)
         |> encode_and_send_out(Phoenix.Socket.Transport.on_exit_message(topic, reason))}
    end
  end

  def handle_info(_message, state), do: {:noreply, state}

  # Handling results of Phoenix.Socket.Transport.dispatch
  defp handle_socket_response(:noreply, state), do: state

  defp handle_socket_response({:reply, reply_message}, state),
    do: encode_and_send_out(state, reply_message)

  defp handle_socket_response({:joined, pid, reply_message}, state) do
    state
    |> store_channel_process(reply_message.topic, pid)
    |> encode_and_send_out(reply_message)
  end

  defp handle_socket_response({:error, _reason, reply_message}, state),
    do: encode_and_send_out(state, reply_message)

  defp store_channel_process(state, topic, pid) do
    state
    |> update_in([:channels], &Map.put(&1, topic, pid))
    |> update_in([:channels_inverse], &Map.put(&1, pid, topic))
  end

  defp delete_channel_process(state, topic, pid) do
    state
    |> update_in([:channels], &Map.delete(&1, topic))
    |> update_in([:channels_inverse], &Map.delete(&1, pid))
  end

  defp encode_and_send_out(state, message), do: send_out(state, NoopSerializer.encode!(message))

  defp send_out(state, encoded_message) do
    if state.receiver, do: send(state.receiver, {:message, encoded_message})
    state
  end

  defp bot_token do
    Phoenix.Token.sign(%Phoenix.Socket{endpoint: CodebattleWeb.Endpoint}, "user_token", 0)
  end
end
