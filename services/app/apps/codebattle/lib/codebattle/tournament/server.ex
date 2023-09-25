defmodule Codebattle.Tournament.Server do
  use GenServer
  require Logger
  alias Codebattle.Tournament

  @type tournament_id :: pos_integer()

  # API
  def start_link(tournament_id) do
    GenServer.start(__MODULE__, tournament_id, name: server_name(tournament_id))
  end

  def get_tournament(id) do
    # try do
    GenServer.call(server_name(id), :get_tournament)
    # catch
    #   :exit, {:noproc, _} ->
    #     nil

    #   :exit, reason ->
    #     Logger.error("Error to get tournament: #{inspect(reason)}")
    #     nil
    # end
  end

  def update_tournament(tournament) do
    try do
      GenServer.call(server_name(tournament.id), {:update, tournament})
    catch
      :exit, reason ->
        Logger.error("Error to send tournament update: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  @spec finish_round_after(tournament_id, pos_integer()) :: :ok | {:error, :not_found}
  def finish_round_after(tournament_id, timeout_in_seconds) do
    try do
      GenServer.call(server_name(tournament_id), {:finish_round_after, timeout_in_seconds})
    catch
      :exit, reason ->
        Logger.error("Error to send message: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  def send_event(tournament_id, event_type, params) do
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

  def handle_call({:update, new_tournament}, _from, state) do
    broadcast_tournament_update(new_tournament)
    {:reply, :ok, %{state | tournament: new_tournament}}
  end

  def handle_call({:finish_round_after, timeout_in_seconds}, _from, state) do
    Process.send_after(
      self(),
      :finish_round_force,
      :timer.seconds(timeout_in_seconds)
    )

    {:reply, :ok, state}
  end

  def handle_call(:get_tournament, _from, state) do
    {:reply, state.tournament, state}
  end

  def handle_call({event_type, params}, _from, state = %{tournament: tournament}) do
    %{module: module} = tournament

    new_tournament = apply(module, event_type, [tournament, params])

    broadcast_tournament_update(new_tournament)
    {:reply, tournament, Map.merge(state, %{tournament: new_tournament})}
  end

  def handle_info(:stop_round_break, %{tournament: tournament}) do
    new_tournament = tournament.module.stop_round_break(tournament)

    broadcast_tournament_update(new_tournament)

    {:noreply, %{tournament: new_tournament}}
  end

  def handle_info(:finish_round_force, %{tournament: tournament}) do
    new_tournament = tournament.module.finish_round_force(tournament)

    broadcast_tournament_update(new_tournament)

    {:noreply, %{tournament: new_tournament}}
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

    case new_tournament do
      %{break_state: "on"} ->
        Process.send_after(
          self(),
          :stop_round_break,
          :timer.seconds(tournament.break_duration_seconds)
        )

      %{break_state: "off"} ->
        :noop
    end

    broadcast_tournament_update(new_tournament)
    {:noreply, %{state | tournament: new_tournament}}
  end

  def handle_info(_message, state) do
    {:noreply, state}
  end

  def tournament_topic_name(tournament_id), do: "tournament:#{tournament_id}"

  defp broadcast_tournament_update(tournament) do
    Codebattle.PubSub.broadcast("tournament:updated", %{tournament: tournament})
  end

  defp server_name(id), do: {:via, Registry, {Codebattle.Registry, "tournament_srv::#{id}"}}
end
