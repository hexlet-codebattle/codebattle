defmodule CodebattleWeb.MainChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.User
  alias CodebattleWeb.Presence

  require Logger

  def join("main", %{"state" => state} = params, socket) do
    current_user = socket.assigns.current_user
    socket = assign(socket, :presence_path, params["path"])

    active_game_id =
      if !current_user.is_guest do
        topic = "main:#{current_user.id}"
        Codebattle.PubSub.subscribe(topic)
        Codebattle.PubSub.subscribe("main")
        Codebattle.PubSub.subscribe("season")

        if !FunWithFlags.enabled?(:skip_presence) do
          send(self(), {:after_join, state})
        end

        follow_id = params["follow_id"]

        if follow_id do
          Codebattle.PubSub.subscribe("user:#{follow_id}")
          Game.Context.get_active_game_id(follow_id)
        end
      end

    {:ok, %{active_game_id: active_game_id}, socket}
  end

  def handle_in("user:follow", %{"user_id" => user_id}, socket) do
    if socket.assigns.current_user.is_guest do
      {:noreply, socket}
    else
      Codebattle.PubSub.subscribe("user:#{user_id}")
      active_game_id = Game.Context.get_active_game_id(user_id)
      {:reply, {:ok, %{active_game_id: active_game_id, follow_id: user_id}}, socket}
    end
  end

  def handle_in("game:report", %{"player_id" => player_id, "game_id" => game_id}, socket) do
    user = socket.assigns.current_user

    case Game.Context.report_on_player(game_id, user, player_id) do
      {:ok, report} ->
        {:reply, {:ok, %{report: %{id: report.id, inserted_at: report.inserted_at}}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("user:ban", %{"user_id" => user_id, "tournament_id" => tournament_id}, socket) do
    if User.admin_or_moderator?(socket.assigns.current_user) do
      Tournament.Context.handle_event(tournament_id, :toggle_ban_player, %{user_id: user_id})
      {:reply, {:ok, %{}}, socket}
    else
      {:reply, {:error, :no_permission}, socket}
    end
  rescue
    e ->
      Logger.error(inspect(e))
      Logger.error(Exception.format_stacktrace(__STACKTRACE__))
      {:reply, {:error, %{}}, socket}
  end

  def handle_in("user:unfollow", %{"user_id" => user_id}, socket) do
    Codebattle.PubSub.unsubscribe("user:#{user_id}")
    {:reply, {:ok, %{}}, socket}
  end

  def handle_in("main:redirect", %{"url" => url, "user_ids" => user_ids}, socket) do
    if User.admin_or_moderator?(socket.assigns.current_user) do
      Codebattle.PubSub.broadcast("main:redirect", %{url: url, user_ids: user_ids})
      {:reply, {:ok, %{}}, socket}
    else
      {:reply, {:error, :no_permission}, socket}
    end
  end

  def handle_in("tournament:player_ids", %{"tournament_id" => tournament_id}, socket) do
    if User.admin_or_moderator?(socket.assigns.current_user) do
      case fetch_tournament(tournament_id) do
        nil ->
          {:reply, {:error, %{reason: "not_found"}}, socket}

        tournament ->
          user_ids =
            tournament
            |> Tournament.Helpers.get_players()
            |> Enum.reject(& &1.is_bot)
            |> Enum.map(& &1.id)

          {:reply, {:ok, %{user_ids: user_ids}}, socket}
      end
    else
      {:reply, {:error, :no_permission}, socket}
    end
  end

  def handle_in("change_presence_state", %{"state" => state}, socket) do
    Presence.update(socket, socket.assigns.current_user.id, %{
      online_at: inspect(System.system_time(:second)),
      state: state,
      path: socket.assigns[:presence_path],
      user: socket.assigns.current_user,
      id: socket.assigns.current_user.id
    })

    {:noreply, socket}
  end

  def handle_in("change_presence_user", _, socket) do
    {:noreply, socket}
  end

  def handle_in(_, _, socket) do
    {:noreply, socket}
  end

  def handle_info(%{event: "user:game_created", payload: payload}, socket) do
    push(socket, "user:game_created", %{active_game_id: payload.active_game_id})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:activated", payload: %{tournament: tournament}}, socket) do
    push(socket, "tournament:activated", %{
      id: tournament.id,
      state: tournament.state,
      grade: tournament.grade,
      starts_at: tournament.starts_at,
      description: tournament.description
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:canceled", payload: %{tournament: tournament}}, socket) do
    push(socket, "tournament:canceled", %{
      id: tournament.id,
      state: tournament.state
    })

    {:noreply, socket}
  end

  def handle_info({:after_join, state}, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.current_user.id, %{
        online_at: inspect(System.system_time(:second)),
        state: state,
        path: socket.assigns[:presence_path],
        user: socket.assigns.current_user,
        id: socket.assigns.current_user.id
      })

    push(socket, "presence_state", Presence.list(socket))

    {:noreply, socket}
  end

  def handle_info(%{event: "main:redirect", payload: payload}, socket) do
    # Global redirect broadcasts skip staff by default. Targeted redirects can
    # pass skip_admins: false, for example when an admin is also a player.
    if !skip_redirect?(payload, socket.assigns.current_user) do
      push(socket, "main:redirect", payload)
    end

    {:noreply, socket}
  end

  def handle_info(%{event: "deploy:handoff_started", payload: payload}, socket) do
    push(socket, "deploy:handoff_started", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "deploy:handoff_done", payload: payload}, socket) do
    push(socket, "deploy:handoff_done", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "deploy:handoff_failed", payload: payload}, socket) do
    push(socket, "deploy:handoff_failed", payload)
    {:noreply, socket}
  end

  #
  # def handle_info(message = %{event: "user:game_created"}, socket) do
  #   push(socket, "user:game:created", message.payload)
  #
  #   {:noreply, socket}
  # end
  #
  def handle_info(message, socket) do
    Logger.warning("MainChannel Unexpected message: " <> inspect(message))
    {:noreply, socket}
  end

  defp skip_redirect?(payload, user) do
    skip_admins? = Map.get(payload, :skip_admins, Map.get(payload, "skip_admins", true))

    skip_admins? && User.admin_or_moderator?(user)
  end

  defp fetch_tournament(tournament_id) do
    case Integer.parse(to_string(tournament_id)) do
      {id, _} -> Tournament.Context.get(id)
      :error -> nil
    end
  end
end
