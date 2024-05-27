defmodule Codebattle.Tournament.Ranking.UpdateFromResultsServer do
  use GenServer
  require Logger

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Ranking
  alias Codebattle.Tournament.TournamentResult

  @interval :timer.seconds(10)

  # API
  def start_link(tournament_id) do
    GenServer.start(__MODULE__, tournament_id, name: server_name(tournament_id))
  end

  @spec update(tournament :: Tournament.t()) :: :ok | {:error, :not_found}
  def update(tournament) do
    try do
      GenServer.call(server_name(tournament.id), :update)
      :ok
    catch
      :exit, reason ->
        Logger.error("Error to send tournament ranking update: #{inspect(reason)}")
        {:error, :not_found}
    end
  end

  # SERVER

  @impl true
  def handle_call(:update, _from, state) do
    perform_update(state.tournament_id)
    {:reply, :ok, state}
  end

  @impl true
  def init(tournament_id) do
    Codebattle.PubSub.subscribe("game:tournament:#{tournament_id}")
    schedule_work()

    {:ok, %{updates_received: false, tournament_id: tournament_id}}
  end

  @impl true
  def handle_info(:work, state) do
    if state.updates_received do
      perform_update(state.tournament_id)
      Logger.debug("UpdateFromResultsServer: performed for tournament #{state.tournament_id}")
      Codebattle.PubSub.broadcast("tournament:results_updated", %{tournament_id: state.tournament_id})
      schedule_work()
      {:noreply, %{state | updates_received: false}}
    else
      Logger.debug("UpdateFromResultsServer: no updates received")
      schedule_work()
      {:noreply, state}
    end
  end

  def handle_info(
        %{
          topic: "game:tournament:" <> _t_id,
          event: "game:tournament:finished"
        },
        state
      ) do
    {:noreply, %{state | updates_received: true}}
  end

  def handle_info(_message, state) do
    {:noreply, state}
  end

  defp perform_update(tournament_id) do
    tournament = Tournament.Context.get_tournament_info(tournament_id)
    TournamentResult.upsert_results(tournament)
    Ranking.set_ranking_to_ets(tournament)
  end

  defp schedule_work() do
    Process.send_after(self(), :work, @interval)
  end

  defp server_name(id),
    do: {:via, Registry, {Codebattle.Registry, "tournament_update_ranking_srv::#{id}"}}
end
