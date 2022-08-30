defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.Game
  alias Codebattle.Bot

  use GenServer

  @timeout :timer.seconds(3)

  @spec start_link([]) :: GenServer.on_start()
  def start_link(_) do
    GenServer.start_link(__MODULE__, :noop, name: __MODULE__)
  end

  @impl GenServer
  def init(_state) do
    Process.send_after(self(), :create_bot_if_needed, @timeout)
    {:ok, :noop}
  end

  @impl GenServer
  def handle_info(:create_bot_if_needed, state) do
    for level <- Codebattle.Task.levels() do
      create_game(level)
    end

    Process.send_after(self(), :create_bot_if_needed, @timeout)
    {:noreply, state}
  end

  @impl GenServer
  def handle_info(_, state), do: {:noreply, state}

  defp create_game(level) do
    games = Game.Context.get_active_games(%{is_bot: true, state: "waiting_opponent", level: level})

    if Enum.count(games) < 1 do
      bot = Bot.Context.build()

      Game.Context.create_game(%{
        state: "waiting_opponent",
        type: "duo",
        mode: "standard",
        visibility_type: "public",
        level: level,
        players: [bot]
      })
    else
      {:error, :game_limit}
    end
  end
end
