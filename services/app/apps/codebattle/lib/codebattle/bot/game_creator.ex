defmodule Codebattle.Bot.GameCreator do
  @moduledoc false
  use GenServer

  alias Codebattle.Bot
  alias Codebattle.Game

  @timeout Application.compile_env(:codebattle, :start_create_bot_timeout)

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
    if FunWithFlags.enabled?(:skip_bot_games) do
      :noop
    else
      for level <- Codebattle.Task.levels() do
        create_game(level)
      end

      Process.send_after(self(), :create_bot_if_needed, @timeout)
    end

    {:noreply, state}
  end

  @impl GenServer
  def handle_info(_, state), do: {:noreply, state}

  defp create_game(level) do
    games =
      Game.Context.get_active_games(%{is_bot: true, state: "waiting_opponent", level: level})

    if Enum.empty?(games) do
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
