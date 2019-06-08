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
    Process.send_after(self(), :create_bot_if_needed, @timeout)
    {:ok, %{}}
  end

  def handle_info(:create_bot_if_needed, state) do
    levels = ["elementary", "easy", "medium", "hard"]

    for level <- levels do
      case Codebattle.Bot.GameCreator.call(level) do
        {:ok, game_id, bot} ->
          # Logger.debug("create_game with id: #{game_id}")
          {:ok, pid} = PlaybookAsyncRunner.start(%{game_id: game_id, bot: bot})

        {:error, reason} ->
          # Logger.debug("Can't create bot game, reason: #{reason}")
      end
    end

    Process.send_after(self(), :create_bot_if_needed, 3_000)
    {:noreply, %{}}
  end

  def handle_info(_, state) do
    {:noreply, state}
  end
end
