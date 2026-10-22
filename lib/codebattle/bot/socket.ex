defmodule Codebattle.Bot.Socket do
  @moduledoc """
  Phoenix v2 channel client for bots, backed by Mint.WebSocket.
  Owns the connection, rejoins channels after disconnects, and buffers bot
  messages until their channel is ready again.
  """
  use GenServer

  @type channel :: {pid(), String.t()}

  def start_link(opts) do
    GenServer.start_link(__MODULE__, Keyword.put_new(opts, :owner, self()))
  end

  def join(socket, topic, params \\ %{}) do
    GenServer.call(socket, {:join, topic, params}, :infinity)
  end

  def push_async({socket, topic}, event, payload) do
    GenServer.cast(socket, {:push, topic, event, payload})
  end

  @impl true
  def init(opts) do
    owner = Keyword.fetch!(opts, :owner)
    Process.monitor(owner)
    send(self(), :connect)

    {:ok,
     %{
       owner: owner,
       uri: URI.parse(Keyword.fetch!(opts, :url)),
       conn: nil,
       websocket: nil,
       request_ref: nil,
       status: nil,
       headers: [],
       upgrade_buffer: <<>>,
       topics: %{},
       pending: %{},
       outbox: [],
       ref: 0,
       heartbeat_ref: nil,
       heartbeat_interval: Keyword.get(opts, :heartbeat_interval, 30_000),
       reconnect_interval: Keyword.get(opts, :reconnect_interval, 1_000),
       connect_timer: nil,
       heartbeat_timer: nil,
       reconnect_timer: nil
     }}
  end

  @impl true
  def handle_call({:join, _topic, _params}, _from, %{websocket: nil} = state) do
    {:reply, {:error, :socket_not_connected}, state}
  end

  def handle_call({:join, topic, params}, from, state) do
    case Map.get(state.topics, topic) do
      %{join_ref: ref} when not is_nil(ref) ->
        {:reply, {:ok, %{}, {self(), topic}}, state}

      _ ->
        {:noreply, join_or_wait(state, topic, params, from)}
    end
  end

  @impl true
  def handle_cast({:push, topic, event, payload}, state) do
    {:noreply, push_message(state, topic, event, payload)}
  end

  defp push_message(state, topic, event, payload) do
    case Map.get(state.topics, topic) do
      %{join_ref: join_ref} when not is_nil(join_ref) ->
        {ref, state} = next_ref(state)
        state = send_message(state, [join_ref, ref, topic, event, payload])

        if state.websocket, do: state, else: queue_message(state, topic, event, payload)

      %{join_ref: nil} ->
        queue_message(state, topic, event, payload)

      _ ->
        state
    end
  end

  @impl true
  def handle_info(:connect, state) do
    state = %{state | reconnect_timer: nil}
    uri = state.uri
    {http_scheme, ws_scheme, port} = schemes(uri)
    path = (uri.path || "/") <> if(uri.query, do: "?" <> uri.query, else: "")

    case Mint.HTTP.connect(http_scheme, uri.host, port, protocols: [:http1], transport_opts: [timeout: 5_000]) do
      {:ok, conn} ->
        case Mint.WebSocket.upgrade(ws_scheme, conn, path, []) do
          {:ok, conn, ref} ->
            timer = Process.send_after(self(), {:connect_timeout, ref}, 5_000)
            {:noreply, %{state | conn: conn, request_ref: ref, connect_timer: timer}}

          {:error, conn, _reason} ->
            {:noreply, disconnect(%{state | conn: conn})}
        end

      {:error, _reason} ->
        {:noreply, disconnect(state)}
    end
  end

  def handle_info({:connect_timeout, ref}, %{request_ref: ref, websocket: nil} = state) do
    {:noreply, disconnect(state)}
  end

  def handle_info({:heartbeat, ref}, %{request_ref: ref, websocket: ws} = state) when not is_nil(ws) do
    if state.heartbeat_ref do
      {:noreply, disconnect(state)}
    else
      {heartbeat_ref, state} = next_ref(state)
      state = send_message(%{state | heartbeat_ref: heartbeat_ref}, [nil, heartbeat_ref, "phoenix", "heartbeat", %{}])
      {:noreply, schedule_heartbeat(state)}
    end
  end

  def handle_info({:join_timeout, ref}, state) do
    case Map.pop(state.pending, ref) do
      {nil, _pending} ->
        {:noreply, state}

      {pending, pending_joins} ->
        reply(pending.from, {:error, :timeout})
        {:noreply, disconnect(%{state | pending: pending_joins})}
    end
  end

  def handle_info({:DOWN, _ref, :process, owner, _reason}, %{owner: owner} = state) do
    {:stop, :normal, state}
  end

  def handle_info(_message, %{conn: nil} = state), do: {:noreply, state}

  def handle_info(message, state) do
    case Mint.WebSocket.stream(state.conn, message) do
      {:ok, conn, responses} ->
        {:noreply, Enum.reduce(responses, %{state | conn: conn}, &handle_response/2)}

      {:error, conn, _reason, _responses} ->
        {:noreply, disconnect(%{state | conn: conn})}

      :unknown ->
        {:noreply, state}
    end
  end

  @impl true
  def terminate(_reason, state) do
    if state.conn, do: Mint.HTTP.close(state.conn)
  end

  defp schemes(%URI{scheme: "wss", port: port}), do: {:https, :wss, port || 443}
  defp schemes(%URI{scheme: "ws", port: port}), do: {:http, :ws, port || 80}

  defp handle_response({:status, ref, status}, %{request_ref: ref} = state), do: %{state | status: status}
  defp handle_response({:headers, ref, headers}, %{request_ref: ref} = state), do: %{state | headers: headers}

  defp handle_response({:done, ref}, %{request_ref: ref, websocket: nil, status: status} = state)
       when is_integer(status) do
    complete_upgrade(state)
  end

  defp handle_response({:data, ref, data}, %{request_ref: ref, websocket: nil} = state) do
    %{state | upgrade_buffer: state.upgrade_buffer <> data}
  end

  defp handle_response({:data, ref, data}, %{request_ref: ref, websocket: ws} = state) when not is_nil(ws) do
    case Mint.WebSocket.decode(ws, data) do
      {:ok, websocket, frames} -> Enum.reduce(frames, %{state | websocket: websocket}, &handle_frame/2)
      {:error, websocket, _reason} -> disconnect(%{state | websocket: websocket})
    end
  end

  defp handle_response(_response, state), do: state

  # Mint WebSocket's constructor has a known Dialyzer false positive: its opaque
  # type excludes the initial nil fragment. Upstream uses the same workaround:
  # https://github.com/elixir-mint/mint_web_socket/blob/main/test/fixtures/autobahn_client.ex
  @dialyzer {:nowarn_function, complete_upgrade: 1}
  defp complete_upgrade(state) do
    case Mint.WebSocket.new(state.conn, state.request_ref, state.status, state.headers) do
      {:ok, conn, websocket} ->
        cancel_timer(state.connect_timer)
        state = schedule_heartbeat(%{state | conn: conn, websocket: websocket, connect_timer: nil})

        state =
          Enum.reduce(state.topics, state, fn {topic, channel}, acc -> join_topic(acc, topic, channel.params, nil) end)

        buffer = state.upgrade_buffer
        state = %{state | upgrade_buffer: <<>>}
        handle_response({:data, state.request_ref, buffer}, state)

      {:error, conn, _reason} ->
        disconnect(%{state | conn: conn})
    end
  end

  defp handle_frame({:text, text}, state) do
    case Jason.decode(text) do
      {:ok, [join_ref, ref, topic, event, payload]} ->
        handle_message(state, join_ref, ref, topic, event, payload)

      _ ->
        disconnect(state)
    end
  end

  defp handle_frame({:ping, payload}, state), do: send_frame(state, {:pong, payload})
  defp handle_frame({:pong, _payload}, state), do: state
  defp handle_frame({:close, _code, _reason}, state), do: state |> send_frame(:close) |> disconnect()
  defp handle_frame(_frame, state), do: disconnect(state)

  defp handle_message(state, _join_ref, ref, "phoenix", "phx_reply", _payload) when ref == state.heartbeat_ref do
    %{state | heartbeat_ref: nil}
  end

  defp handle_message(state, _join_ref, ref, topic, "phx_reply", payload) do
    case Map.pop(state.pending, ref) do
      {nil, _pending} ->
        state

      {pending, pending_joins} ->
        cancel_timer(pending.timer)
        state = %{state | pending: pending_joins}

        case payload do
          %{"status" => "ok", "response" => response} ->
            reply(pending.from, {:ok, response, {self(), topic}})

            state
            |> put_in([:topics, topic], %{params: pending.params, join_ref: ref})
            |> flush_topic(topic)

          _ ->
            reply(pending.from, {:error, payload})
            %{state | topics: Map.delete(state.topics, topic)}
        end
    end
  end

  defp handle_message(state, join_ref, ref, topic, event, payload) do
    case Map.get(state.topics, topic) do
      %{join_ref: current_ref} when not is_nil(current_ref) and (is_nil(join_ref) or join_ref == current_ref) ->
        send(state.owner, %{topic: topic, event: event, payload: payload, ref: ref})
        handle_channel_event(state, topic, event)

      _ ->
        state
    end
  end

  defp handle_channel_event(state, _topic, "phx_error"), do: disconnect(state)
  defp handle_channel_event(state, topic, "phx_close"), do: %{state | topics: Map.delete(state.topics, topic)}
  defp handle_channel_event(state, _topic, _event), do: state

  defp join_topic(state, topic, params, from) do
    {ref, state} = next_ref(state)
    timer = Process.send_after(self(), {:join_timeout, ref}, 5_000)
    pending = %{from: List.wrap(from), topic: topic, params: params, timer: timer}

    state
    |> Map.put(:pending, Map.put(state.pending, ref, pending))
    |> Map.put(:topics, Map.put(state.topics, topic, %{params: params, join_ref: nil}))
    |> send_message([ref, ref, topic, "phx_join", params])
  end

  defp join_or_wait(state, topic, params, from) do
    case Enum.find(state.pending, fn {_ref, pending} -> pending.topic == topic end) do
      {ref, pending} ->
        put_in(state.pending[ref], %{pending | from: [from | pending.from]})

      nil ->
        join_topic(state, topic, params, from)
    end
  end

  defp next_ref(state) do
    ref = state.ref + 1
    {Integer.to_string(ref), %{state | ref: ref}}
  end

  defp queue_message(state, topic, event, payload) do
    # Editor updates replace the whole document/caret. Keep their latest values
    # while offline, but preserve submissions and chat messages in order.
    outbox =
      if event in ["editor:data", "editor:cursor_position"] do
        Enum.reject(state.outbox, fn {queued_topic, queued_event, _payload} ->
          queued_topic == topic and queued_event == event
        end)
      else
        state.outbox
      end

    %{state | outbox: Enum.take(outbox ++ [{topic, event, payload}], -256)}
  end

  defp flush_topic(state, topic) do
    {messages, outbox} = Enum.split_with(state.outbox, fn {queued_topic, _, _} -> queued_topic == topic end)

    Enum.reduce(messages, %{state | outbox: outbox}, fn {topic, event, payload}, acc ->
      push_message(acc, topic, event, payload)
    end)
  end

  defp send_message(state, message), do: send_frame(state, {:text, Jason.encode!(message)})

  defp send_frame(%{websocket: nil} = state, _frame), do: state

  defp send_frame(state, frame) do
    case Mint.WebSocket.encode(state.websocket, frame) do
      {:ok, websocket, data} ->
        case Mint.WebSocket.stream_request_body(state.conn, state.request_ref, data) do
          {:ok, conn} -> %{state | conn: conn, websocket: websocket}
          {:error, conn, _reason} -> disconnect(%{state | conn: conn, websocket: websocket})
        end

      {:error, websocket, _reason} ->
        disconnect(%{state | websocket: websocket})
    end
  end

  defp schedule_heartbeat(%{websocket: nil} = state), do: state

  defp schedule_heartbeat(state) do
    timer = Process.send_after(self(), {:heartbeat, state.request_ref}, state.heartbeat_interval)
    %{state | heartbeat_timer: timer}
  end

  defp disconnect(state) do
    if state.conn, do: Mint.HTTP.close(state.conn)
    cancel_timer(state.connect_timer)
    cancel_timer(state.heartbeat_timer)

    for {_ref, pending} <- state.pending do
      cancel_timer(pending.timer)
      reply(pending.from, {:error, :disconnected})
    end

    reconnect_timer =
      state.reconnect_timer || Process.send_after(self(), :connect, state.reconnect_interval)

    topics = Map.new(state.topics, fn {topic, channel} -> {topic, %{channel | join_ref: nil}} end)

    %{
      state
      | conn: nil,
        websocket: nil,
        request_ref: nil,
        status: nil,
        headers: [],
        upgrade_buffer: <<>>,
        reconnect_timer: reconnect_timer,
        pending: %{},
        topics: topics,
        heartbeat_ref: nil,
        connect_timer: nil,
        heartbeat_timer: nil
    }
  end

  defp reply(callers, message), do: Enum.each(callers, &GenServer.reply(&1, message))
  defp cancel_timer(nil), do: :ok
  defp cancel_timer(timer), do: Process.cancel_timer(timer)
end
