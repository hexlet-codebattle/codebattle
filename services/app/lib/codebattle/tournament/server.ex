defmodule Codebattle.Tournament.Server do
  use GenServer

  # API
  def start_link(tournament) do
    GenServer.start(__MODULE__, tournament, name: server_name(tournament.id))
  end

  def add_message(id, user, msg) do
    GenServer.cast(server_name(id), {:add_message, user, msg})
  end

  def get_messages(id) do
    try do
      GenServer.call(server_name(id), :get_messages)
    catch
      :exit, _reason ->
        []
    end
  end

  def get_tournament(id) do
    case get_pid(id) do
      :undefined ->
        nil

      _pid ->
        GenServer.call(server_name(id), :get_tournament)
    end
  end

  def update_tournament(tournament_id, event_type, params) do
    GenServer.cast(server_name(tournament_id), {event_type, params})
  end

  def get_pid(id) do
    :gproc.where(tournament_key(id))
  end

  # SERVER
  def init(tournament) do
    {:ok, %{tournament: tournament, messages: []}}
  end

  def handle_call(:get_messages, _from, state) do
    %{messages: messages} = state
    {:reply, Enum.reverse(messages), state}
  end

  def handle_call(:get_tournament, _from, state) do
    %{tournament: tournament} = state
    {:reply, tournament, state}
  end

  def handle_cast({event_type, params}, %{tournament: tournament} = state) do
    %{module: module} = tournament
    new_tournament = apply(module, event_type, [tournament, params])

    broadcast_tournament(new_tournament)
    {:noreply, Map.merge(state, %{tournament: new_tournament})}
  end

  def handle_cast({:add_message, user, msg}, state) do
    %{messages: messages} = state
    new_msgs = [%{user_name: user.name, message: msg} | messages]
    {:noreply, %{state | messages: new_msgs}}
  end

  # HELPERS

  defp broadcast_tournament(tournament) do
    CodebattleWeb.Endpoint.broadcast!(
      tournament_topic_name(tournament.id),
      "update_tournament",
      %{tournament: tournament}
    )
  end

  defp server_name(id) do
    {:via, :gproc, tournament_key(id)}
  end

  defp tournament_key(id) do
    {:n, :l, {:tournament, "#{id}"}}
  end

  defp tournament_topic_name(tournament_id), do: "tournament_#{tournament_id}"
end
