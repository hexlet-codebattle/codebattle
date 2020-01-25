defmodule Codebattle.Tournament.Server do
  use GenServer

  # API
  def start(tournament) do
    GenServer.start(__MODULE__, tournament, name: tournament_key(tournament.id))
  end

  def add_message(id, user, msg) do
    GenServer.cast(tournament_key(id), {:add_message, user, msg})
  end

  def get_messages(id) do
    try do
      GenServer.call(tournament_key(id), :get_messages)
    catch
      :exit, _reason ->
        []
    end
  end

  def update_tournament(tournament_id, event_type, params) do
    GenServer.cast(tournament_key(tournament_id), {event_type, params})
  end

  # SERVER
  def init(tournament) do
    tournament_module = Codebattle.Tournament.Helpers.get_module(tournament)
    {:ok, %{tournament: tournament, tournament_module: tournament_module, messages: []}}
  end

  # Tournament chat
  def handle_call(:get_messages, _from, state) do
    %{messages: messages} = state
    {:reply, Enum.reverse(messages), state}
  end

  def handle_cast({:add_message, user, msg}, state) do
    %{messages: messages} = state
    new_msgs = [%{user_name: user.name, message: msg} | messages]
    {:noreply, %{state | messages: new_msgs}}
  end

  # Tournament
  def handle_cast({event_type, params}, state) do
    new_tournament = apply(state.tournament_module, event_type, [state.tournament, params])
    broadcast_tournament(new_tournament)
    {:noreply, Map.merge(state, %{tournament: new_tournament})}
  end


  # HELPERS

  defp broadcast_tournament(tournament) do
    CodebattleWeb.Endpoint.broadcast!(
      tournament_topic_name(tournament.id),
      "update_tournament",
      %{tournament: tournament}
    )
  end

  defp tournament_key(id) do
    {:via, :gproc, {:n, :l, {:tournament, "#{id}"}}}
  end

  defp tournament_topic_name(tournament_id), do: "tournament_#{tournament_id}"
end
