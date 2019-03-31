defmodule Codebattle.Bot.CreatorServer do
  require Logger

  use GenServer

  alias Codebattle.Repo
  alias Codebattle.Bot.PlaybookAsyncRunner

  def start_link() do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def init(state) do
    Process.send_after(self(), :create_bot_if_need, 1_000)
    {:ok, %{}}
  end

  case Codebattle.Bot.GameCreator.call() do
  def handle_info(:create_bot_if_need, state) do
      {:ok, game_id, _task_id} ->

        Process.send_after(self(), :create_bot_if_need, 3_000)
        {:ok, pid}=PlaybookAsyncRunner.start(%{game_id: game_id})


        {:noreply, %{}}
      {:error, reason} ->
        # Logger.debug("Can't create bot game, reason: #{reason}")
        Process.send_after(self(), :create_bot_if_need, 5_000)
        {:noreply, %{}}
    end
  end

  def handle_info(_, state) do
    {:noreply, state}
  end
end
