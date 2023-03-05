defmodule Codebattle.Tournament.Server do
  use GenServer
  require Logger
  alias Codebattle.Tournament

  # API
  def start_link(tournament_id) do
    GenServer.start(__MODULE__, tournament_id, name: server_name(tournament_id))
  end

  def get_tournament(id) do
    try do
      GenServer.call(server_name(id), :get_tournament)
    catch
      :exit, {:noproc, _} ->
        nil

      :exit, reason ->
        Logger.error("Error to get tournament: #{inspect(reason)}")
        nil
    end
  end

  def reload_from_db(id) do
    GenServer.cast(server_name(id), :reload_from_db)
  end

  def update_tournament(tournament_id, event_type, params) do
    try do
      GenServer.call(server_name(tournament_id), {event_type, params})
    catch
      :exit, reason ->
        Logger.error("Error to send tournament update: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  # SERVER
  def init(tournament_id) do
    Codebattle.PubSub.subscribe("game:tournament:#{tournament_id}")

    tournament =
      tournament_id
      |> Tournament.Context.get_from_db!()
      |> Tournament.Context.mark_as_live()

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

  def handle_call({event_type, params}, _from, state = %{tournament: tournament}) do
    %{module: module} = tournament

    new_tournament = apply(module, event_type, [tournament, params])

    broadcast_tournament_update(new_tournament)
    {:reply, tournament, Map.merge(state, %{tournament: new_tournament})}
  end

  def handle_info(
        %{
          topic: "game:tournament:" <> _t_id,
          event: "game:tournament:finished",
          payload: payload
        },
        state = %{tournament: tournament}
      ) do
    new_tournament = tournament.module.finish_match(tournament, payload)

    broadcast_tournament_update(new_tournament)
    {:noreply, %{state | tournament: new_tournament}}
  end

  def handle_info(message, state) do
    Logger.debug(message)
    {:noreply, state}
  end

  def tournament_topic_name(tournament_id), do: "tournament:#{tournament_id}"

  defp broadcast_tournament_update(tournament) do
    Codebattle.PubSub.broadcast("tournament:updated", %{tournament: tournament})
  end

  defp server_name(id), do: {:via, Registry, {Codebattle.Registry, "tournament_srv::#{id}"}}
end
