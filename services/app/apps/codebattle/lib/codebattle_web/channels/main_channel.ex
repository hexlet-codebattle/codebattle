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

    active_game_id =
      if !current_user.is_guest do
        topic = "main:#{current_user.id}"
        Codebattle.PubSub.subscribe(topic)
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
    if User.admin?(socket.assigns.current_user) do
      # User.toggle_ban_user(user_id)

      Tournament.Context.handle_event(tournament_id, :toggle_ban_player, %{user_id: user_id})
      {:reply, {:ok, %{}}, socket}
    else
      {:reply, {:error, :no_admin}, socket}
    end
  rescue
    e ->
      Logger.error(inspect(e))
      Logger.error(Exception.format_stacktrace(__STACKTRACE__))
      {:reply, {:error, %{}}, socket}
  end

  def handle_in("user:unfollow", %{"user_id" => user_id}, socket) do
    Codebattle.PubSub.unsubscribe("user:#{user_id}")
    {:noreply, socket}
  end

  def handle_in("change_presence_state", %{"state" => state}, socket) do
    Presence.update(socket, socket.assigns.current_user.id, %{
      online_at: inspect(System.system_time(:second)),
      state: state,
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

  def handle_info({:after_join, state}, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.current_user.id, %{
        online_at: inspect(System.system_time(:second)),
        state: state,
        user: socket.assigns.current_user,
        id: socket.assigns.current_user.id
      })

    push(socket, "presence_state", Presence.list(socket))

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
end
