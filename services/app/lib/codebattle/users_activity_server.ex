defmodule Codebattle.UsersActivityServer do
  @moduledoc "Gen server for collect actions from users"

  use GenServer

  alias Codebattle.Analitics
  require Logger

  @max_size Application.compile_env(:codebattle, Codebattle.Analitics)[:max_size_activity_server]

  @timeout :timer.minutes(5)

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def add_event(%{user_id: user_id}) when user_id < 0, do: :ok

  def add_event(params) do
    event =
      params
      |> Map.update!(:user_id, fn
        "anonymous" -> nil
        id -> id
      end)
      |> Map.put(:date, NaiveDateTime.utc_now())

    GenServer.cast(__MODULE__, {:add_event, event})
  end

  def get_events(), do: GenServer.call(__MODULE__, :get_events)

  def reset(), do: GenServer.call(__MODULE__, :reset)

  # SERVER
  def init(state) do
    Logger.info("Start Events Server")
    Process.send_after(self(), :store_events, @timeout)
    {:ok, state}
  end

  def handle_cast({:add_event, event}, events)
      when length(events) >= @max_size do
    Analitics.store_user_events([event | events])
    {:noreply, []}
  end

  def handle_cast({:add_event, event}, events), do: {:noreply, [event | events]}

  def handle_call(:get_events, _from, events), do: {:reply, events, events}

  def handle_call(:reset, _from, _events), do: {:reply, [], []}

  def handle_info(:store_events, events) do
    Process.send_after(self(), :store_events, @timeout)
    Analitics.store_user_events(events)
    {:noreply, []}
  end
end
