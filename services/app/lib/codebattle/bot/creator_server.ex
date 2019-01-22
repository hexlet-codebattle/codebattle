defmodule Codebattle.Bot.CreatorServer do

  require Logger

  use GenServer

  alias Codebattle.Repo
  alias Codebattle.Bot.Playbook

  def start_link() do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def init(state) do
    Process.send_after(self(), :create_bot_if_need, 1_000)
    {:ok, %{}}
  end

  def handle_info(:create_bot_if_need, state) do
    Codebattle.Bot.GameCreator.call()
    Process.send_after(self(), :create_bot_if_need, 10_000)

    {:noreply, %{}}
  end

  def handle_info(_, state) do
      {:noreply, state}
  end
end
