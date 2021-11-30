defmodule Codebattle.Tournament.Server do
  use GenServer
  require Logger
  alias Codebattle.Tournament

  # API
  def start_link(tournament) do
    GenServer.start(__MODULE__, tournament, name: server_name(tournament.id))
  end

  def get_tournament(id) do
    try do
      GenServer.call(server_name(id), :get_tournament)
    catch
      :exit, _reason -> nil
    end
  end

  def update_tournament(tournament_id, event_type, params) do
    try do
      GenServer.call(server_name(tournament_id), {event_type, params})
    catch
      :exit, _reason ->
        {:error, :not_found}
    end
  end

  def reload_from_db(id) do
    GenServer.cast(server_name(id), :reload_from_db)
  end

  # SERVER
  def init(tournament) do
    Codebattle.PubSub.subscribe("game:tournament:#{tournament.id}")
    {:ok, %{tournament: tournament}}
  end

  def handle_cast(:reload_from_db, state) do
    %{tournament: tournament} = state
    new_tournament = Tournament.Context.get_from_db!(tournament.id)
    {:noreply, %{state | tournament: new_tournament}}
  end

  def handle_call(:get_tournament, _from, state) do
    %{tournament: tournament} = state
    {:reply, tournament, state}
  end

  def handle_call({event_type, params}, _from, %{tournament: tournament} = state) do
    %{module: module} = tournament
    new_tournament = apply(module, event_type, [tournament, params])

    broadcast_tournament_update(new_tournament)
    {:reply, tournament, Map.merge(state, %{tournament: new_tournament})}
  end

  def tournament_topic_name(tournament_id), do: "tournament:#{tournament_id}"

  def handle_info(
        %{
          topic: "game:tournament:" <> _t_id,
          event: "game:tournament:finished",
          payload: payload
        },
        %{tournament: tournament} = state
      ) do

    new_tournament = tournament.module.finish_match(tournament, payload)

    broadcast_tournament_update(new_tournament)
    {:noreply, %{state | tournament: new_tournament}}
  end

  def handle_info(message, state) do
    Logger.debug(message)
    {:noreply, state}
  end

  # HELPERS

  defp broadcast_tournament_update(tournament) do
    Codebattle.PubSub.broadcast("tournament:updated", %{tournament: tournament})
  end

  defp server_name(id), do: {:via, :gproc, tournament_key(id)}
  defp tournament_key(id), do: {:n, :l, {:tournament_srv, to_string(id)}}
end
