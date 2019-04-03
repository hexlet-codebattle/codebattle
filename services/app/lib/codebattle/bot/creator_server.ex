defmodule Codebattle.Bot.CreatorServer do
  require Logger

  use GenServer

  alias Codebattle.Repo
  alias Codebattle.Bot.PlaybookAsyncRunner

  @timeout Application.get_env(:codebattle, Codebattle.Bot)[:timeout]

  def start_link() do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def init(state) do
    Process.send_after(self(), :create_bot_if_need, @timeout)
    {:ok, %{}}
  end

  def handle_info(:create_bot_if_need, state) do
    level = ["elementary", "easy", "medium", "hard"] |> Enum.random()

    case Codebattle.Bot.GameCreator.call(level) do
      {:ok, game_id, bot} ->
        Process.send_after(self(), :create_bot_if_need, 3_000)
        {:ok, pid} = PlaybookAsyncRunner.start(%{game_id: game_id, bot: bot})

        {:noreply, %{}}

      {:error, reason} ->
        Logger.debug("Can't create bot game, reason: #{reason}")
        Process.send_after(self(), :create_bot_if_need, 5_000)
        {:noreply, %{}}
    end
  end

  def handle_info(_, state) do
    {:noreply, state}
  end
end
