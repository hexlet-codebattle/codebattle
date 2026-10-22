defmodule Codebattle.Bot.SocketTest do
  use ExUnit.Case, async: false

  alias Codebattle.Bot.Socket

  defmodule Peer do
    @moduledoc false
    @behaviour WebSock

    @impl true
    def init(owner) do
      send(owner, {:connected, self()})
      {:ok, %{owner: owner, heartbeat: true, join_reply: nil}}
    end

    @impl true
    def handle_in({text, [opcode: :text]}, state) do
      [join_ref, ref, topic, event, payload] = message = Jason.decode!(text)
      send(state.owner, {:message, self(), message})

      case event do
        "phx_join" when is_map_key(payload, "ignore") ->
          {:ok, state}

        "phx_join" when is_map_key(payload, "delay") ->
          reply = [join_ref, ref, topic, "phx_reply", %{status: "ok", response: %{}}]
          {:ok, %{state | join_reply: Jason.encode!(reply)}}

        "phx_join" ->
          status = if payload["reject"], do: "error", else: "ok"
          reply = [join_ref, ref, topic, "phx_reply", %{status: status, response: %{}}]
          {:push, {:text, Jason.encode!(reply)}, state}

        "heartbeat" when state.heartbeat ->
          reply = [nil, ref, topic, "phx_reply", %{status: "ok", response: %{}}]
          {:push, {:text, Jason.encode!(reply)}, state}

        _ ->
          {:ok, state}
      end
    end

    @impl true
    def handle_control({payload, [opcode: :pong]}, state) do
      send(state.owner, {:pong, payload})
      {:ok, state}
    end

    def handle_control(_frame, state), do: {:ok, state}

    @impl true
    def handle_info({:frame, frame}, state), do: {:push, frame, state}
    def handle_info(:close, state), do: {:stop, :normal, state}

    def handle_info(:ack_join, state), do: {:push, {:text, state.join_reply}, %{state | join_reply: nil}}

    def handle_info(:ignore_heartbeats, state) do
      send(state.owner, :ignoring_heartbeats)
      {:ok, %{state | heartbeat: false}}
    end
  end

  defmodule Endpoint do
    @behaviour Plug

    @impl true
    def init(owner), do: owner

    @impl true
    def call(conn, owner) do
      if conn.request_path == "/reject" do
        send(owner, :upgrade_rejected)
        Plug.Conn.send_resp(conn, 403, "Forbidden")
      else
        conn |> WebSockAdapter.upgrade(Peer, owner, []) |> Plug.Conn.halt()
      end
    end
  end

  setup do
    server = start_supervised!({Bandit, plug: {Endpoint, self()}, port: 0, startup_log: false})
    {:ok, {_address, port}} = ThousandIsland.listener_info(server)
    {:ok, url: "ws://localhost:#{port}/socket?vsn=2.0.0"}
  end

  test "joins multiple topics, preserves join references, and delivers broadcasts", %{url: url} do
    socket = start_supervised!({Socket, url: url, owner: self()})
    assert_receive {:connected, peer}
    assert {:ok, %{}, game} = join(socket, "game:1", %{"token" => "test"})
    assert_receive {:message, ^peer, [join_ref, join_ref, "game:1", "phx_join", %{"token" => "test"}]}
    assert {:ok, %{}, chat} = Socket.join(socket, "chat:g_1")
    assert_receive {:message, ^peer, [chat_ref, chat_ref, "chat:g_1", "phx_join", %{}]}

    Socket.push_async(game, "editor:data", %{"editor_text" => "hello"})
    assert_receive {:message, ^peer, [^join_ref, _, "game:1", "editor:data", %{"editor_text" => "hello"}]}
    Socket.push_async(chat, "chat:add_msg", %{"text" => "hi"})
    assert_receive {:message, ^peer, [^chat_ref, _, "chat:g_1", "chat:add_msg", %{"text" => "hi"}]}

    send(peer, {:frame, {:text, Jason.encode!([nil, nil, "game:1", "editor:data", %{"user_id" => 42}])}})
    assert_receive %{topic: "game:1", event: "editor:data", payload: %{"user_id" => 42}}
    send(peer, {:frame, {:text, Jason.encode!(["stale", nil, "game:1", "stale", %{}])}})
    refute_receive %{event: "stale"}
  end

  test "replies to WebSocket pings and keeps Phoenix heartbeats alive", %{url: url} do
    socket = start_supervised!({Socket, url: url, owner: self(), heartbeat_interval: 30})
    assert_receive {:connected, peer}
    assert {:ok, _, _} = join(socket, "game:1")
    send(peer, {:frame, {:ping, "ping payload"}})
    assert_receive {:pong, "ping payload"}
    assert_receive {:message, ^peer, [nil, _, "phoenix", "heartbeat", %{}]}, 500
    assert_receive {:message, ^peer, [nil, _, "phoenix", "heartbeat", %{}]}, 500
    assert Process.alive?(socket)
  end

  test "reconnects and rejoins topics with fresh references after a close", %{url: url} do
    socket = start_supervised!({Socket, url: url, owner: self(), reconnect_interval: 10})
    assert_receive {:connected, peer}
    assert {:ok, _, game} = join(socket, "game:1")
    assert_receive {:message, ^peer, [old_ref, old_ref, "game:1", "phx_join", %{}]}
    send(peer, :close)
    assert_receive {:connected, new_peer}, 1_000
    assert_receive {:message, ^new_peer, [new_ref, new_ref, "game:1", "phx_join", %{}]}, 1_000
    refute old_ref == new_ref

    # A synchronous join waits for the rejoin reply before returning the handle.
    assert {:ok, _, ^game} = join(socket, "game:1")
    Socket.push_async(game, "editor:data", %{})
    assert_receive {:message, ^new_peer, [^new_ref, _, "game:1", "editor:data", %{}]}
  end

  test "reconnects when Phoenix stops acknowledging heartbeats", %{url: url} do
    socket = start_supervised!({Socket, url: url, owner: self(), heartbeat_interval: 50, reconnect_interval: 10})
    assert_receive {:connected, peer}
    assert {:ok, _, _} = join(socket, "game:1")
    send(peer, :ignore_heartbeats)
    assert_receive :ignoring_heartbeats
    assert_receive {:connected, _new_peer}, 1_000
  end

  test "retains the final editor state and submission until a reconnect has rejoined", %{url: url} do
    socket = start_supervised!({Socket, url: url, owner: self(), reconnect_interval: 10})
    assert_receive {:connected, peer}
    joining = Task.async(fn -> join(socket, "game:1", %{"delay" => true}) end)
    assert_receive {:message, ^peer, [_, _, "game:1", "phx_join", _]}
    send(peer, :ack_join)
    assert {:ok, _, game} = Task.await(joining)
    send(peer, :close)
    assert_receive {:connected, new_peer}, 1_000
    assert_receive {:message, ^new_peer, [join_ref, join_ref, "game:1", "phx_join", _]}, 1_000

    Socket.push_async(game, "editor:data", %{"editor_text" => "outdated"})
    Socket.push_async(game, "editor:data", %{"editor_text" => "solution"})
    Socket.push_async(game, "check_result", %{"editor_text" => "solution"})
    # Both messages come from this process, so the call is a barrier for the casts.
    :sys.get_state(socket)
    send(new_peer, :ack_join)

    assert_receive {:message, ^new_peer, [^join_ref, _, "game:1", "editor:data", %{"editor_text" => "solution"}]}
    assert_receive {:message, ^new_peer, [^join_ref, _, "game:1", "check_result", %{"editor_text" => "solution"}]}
    refute_receive {:message, ^new_peer, [_, _, "game:1", "editor:data", %{"editor_text" => "outdated"}]}
  end

  test "returns rejected joins without inventing a successful channel", %{url: url} do
    socket = start_supervised!({Socket, url: url, owner: self()})
    assert_receive {:connected, _peer}
    assert {:error, %{"status" => "error"}} = join(socket, "game:1", %{"reject" => true})
    assert {:ok, _, _} = Socket.join(socket, "game:1")
  end

  test "retries rejected HTTP upgrades", %{url: url} do
    url = String.replace(url, "/socket?", "/reject?")
    socket = start_supervised!({Socket, url: url, owner: self(), reconnect_interval: 10})
    assert_receive :upgrade_rejected, 1_000
    assert_receive :upgrade_rejected, 1_000
    assert Socket.join(socket, "game:1") == {:error, :socket_not_connected}
  end

  test "retries connection failures until the server becomes available" do
    {:ok, listener} = :gen_tcp.listen(0, [])
    {:ok, {_address, port}} = :inet.sockname(listener)
    :gen_tcp.close(listener)

    socket =
      start_supervised!({Socket, url: "ws://localhost:#{port}/socket", owner: self(), reconnect_interval: 10})

    assert Socket.join(socket, "game:1") == {:error, :socket_not_connected}

    start_supervised!({Bandit, plug: {Endpoint, self()}, port: port, startup_log: false}, id: :late_server)
    assert {:ok, _, _} = join(socket, "game:1")
  end

  test "returns a timeout and reconnects when a join is never acknowledged", %{url: url} do
    socket = start_supervised!({Socket, url: url, owner: self(), reconnect_interval: 10})
    assert_receive {:connected, _peer}
    assert {:error, :timeout} = join(socket, "game:1", %{"ignore" => true})
    assert_receive {:connected, _new_peer}, 1_000
  end

  test "closes the socket when its owner exits normally", %{url: url} do
    parent = self()

    owner =
      spawn(fn ->
        {:ok, socket} = Socket.start_link(url: url)
        send(parent, {:client, socket})

        receive do
          :stop -> :ok
        end
      end)

    assert_receive {:client, socket}
    monitor = Process.monitor(socket)
    send(owner, :stop)
    assert_receive {:DOWN, ^monitor, :process, ^socket, :normal}, 1_000
  end

  defp join(socket, topic, params \\ %{}, attempts \\ 100)
  defp join(_socket, _topic, _params, 0), do: flunk("WebSocket did not connect")

  defp join(socket, topic, params, attempts) do
    case Socket.join(socket, topic, params) do
      {:error, :socket_not_connected} ->
        Process.sleep(10)
        join(socket, topic, params, attempts - 1)

      result ->
        result
    end
  end
end
