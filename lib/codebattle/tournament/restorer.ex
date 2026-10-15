defmodule Codebattle.Tournament.Restorer do
  @moduledoc false

  use GenServer

  require Logger

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  @impl true
  def init(:ok) do
    {:ok, %{}, {:continue, :restore}}
  end

  @impl true
  def handle_continue(:restore, state) do
    Codebattle.Tournament.Context.restore_live_tournaments()
    {:noreply, state}
  rescue
    error ->
      Logger.error("Failed to restore tournaments after boot: #{inspect(error)}")
      {:noreply, state}
  end
end
