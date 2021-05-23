defmodule Codebattle.Bot.CreatorServer do
  require Logger

  use GenServer

  @timeout Application.compile_env(:codebattle, Codebattle.Bot)[:timeout]

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def init(_state) do
    Process.send_after(self(), :create_bot_if_needed, @timeout)
    {:ok, %{}}
  end

  def handle_info(:create_bot_if_needed, state) do
    levels = ["elementary", "easy", "medium", "hard"]

    for level <- levels do
      # create fsm for every level, if no waiting opponent games
      Codebattle.Bot.GameCreator.call(level)
    end

    Process.send_after(self(), :create_bot_if_needed, 3_000)
    {:noreply, state}
  end

  def handle_info(_, state) do
    {:noreply, state}
  end
end
