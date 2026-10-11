defmodule CodebattleWeb.PublicApi.V1.EventController do
  @moduledoc """
  `GET /me/events`: a Server-Sent Events stream of everything that happens to the user.

  The request stays open: first a `hello` event with the current state, then one event per
  change (invites, the user's games, tournaments they play in or run), and a `: ping` comment
  every few seconds so proxies keep the connection. The stream closes itself after
  `:public_api_events_lifetime_ms` (an hour), and clients reconnect; nothing is replayed, the
  new `hello` carries the current state instead.
  """
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers

  alias Codebattle.Invite
  alias Codebattle.PubSub.Message
  alias Codebattle.PubSub.UserEvents
  alias Codebattle.Repo
  alias CodebattleWeb.PublicApi.V1.ErrorJSON
  alias CodebattleWeb.PublicApi.V1.JSON
  alias CodebattleWeb.PublicApi.V1.Snapshot

  @max_streams_per_user 2
  @retry_ms 3000

  plug(:require_scope, "read")

  def stream(conn, _params) do
    user = conn.assigns.current_user

    if open_streams(user.id) >= @max_streams_per_user do
      ErrorJSON.send_error(conn, 429, "rate_limited", "At most #{@max_streams_per_user} event streams per user")
    else
      {:ok, _} = Registry.register(Codebattle.Registry, {:public_api_events, user.id, make_ref()}, nil)
      Codebattle.PubSub.subscribe(UserEvents.topic(user.id))
      Codebattle.PubSub.subscribe("invites:#{user.id}")

      conn =
        conn
        |> put_resp_header("content-type", "text/event-stream; charset=utf-8")
        |> put_resp_header("cache-control", "no-cache")
        # nginx (ingress) must not buffer the stream
        |> put_resp_header("x-accel-buffering", "no")
        |> send_chunked(200)

      deadline = System.monotonic_time(:millisecond) + config(:lifetime_ms, to_timeout(hour: 1))

      with {:ok, conn} <- chunk(conn, "retry: #{@retry_ms}\n\n"),
           {:ok, conn} <- send_event(conn, "hello", Snapshot.hello(user)) do
        loop(conn, user, deadline)
      else
        _ -> conn
      end
    end
  end

  @doc "Number of event streams the user has open on this node."
  def open_streams(user_id) do
    Codebattle.Registry
    |> Registry.select([{{{:public_api_events, user_id, :_}, :_, :_}, [], [true]}])
    |> length()
  end

  defp loop(conn, user, deadline) do
    remaining = deadline - System.monotonic_time(:millisecond)

    if remaining <= 0 do
      conn |> send_event("bye", %{reason: "lifetime"}) |> latest(conn)
    else
      receive do
        %Message{} = message ->
          case event(message, user) do
            nil -> loop(conn, user, deadline)
            {name, data} -> conn |> send_event(name, data) |> continue(conn, user, deadline)
          end
      after
        min(config(:ping_ms, to_timeout(second: 15)), remaining) ->
          conn |> chunk(": ping\n\n") |> continue(conn, user, deadline)
      end
    end
  end

  defp continue({:ok, conn}, _previous, user, deadline), do: loop(conn, user, deadline)
  # the client went away
  defp continue({:error, _reason}, previous, _user, _deadline), do: previous

  defp latest({:ok, conn}, _previous), do: conn
  defp latest({:error, _reason}, previous), do: previous

  ## Events

  defp event(%Message{event: "invites:" <> action, payload: %{invite: %{id: id}}}, user) do
    case Repo.get(Invite, id) do
      %Invite{} = invite ->
        invite = Repo.preload(invite, [:creator, :recipient])
        {"invite.#{action}", %{invite: JSON.invite(invite, user.id)}}

      nil ->
        nil
    end
  end

  defp event(%Message{event: "game." <> _ = name, payload: %{game: game}}, user) do
    {name, %{game: JSON.game(game, user.id)}}
  end

  defp event(%Message{event: "tournament." <> _ = name, payload: %{tournament: tournament} = payload}, user) do
    data = %{tournament: JSON.tournament(tournament, user)}

    data =
      case payload do
        %{player: player} -> Map.put(data, :player, player)
        %{player_id: player_id} -> Map.put(data, :player_id, player_id)
        _ -> data
      end

    {name, data}
  end

  defp event(_message, _user), do: nil

  defp send_event(conn, name, data) do
    data = Map.put_new(data, :server_time, JSON.server_time())
    chunk(conn, "id: #{System.system_time(:millisecond)}\nevent: #{name}\ndata: #{Jason.encode!(data)}\n\n")
  end

  defp config(key, default) do
    :codebattle |> Application.get_env(:public_api_events, []) |> Keyword.get(key, default)
  end
end
