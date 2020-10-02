defmodule Codebattle.Utils.ContainerGameKiller do
  use GenServer

  @game_timeout 15

  # API
  def start_link() do
    GenServer.start(__MODULE__, [], name: __MODULE__)
  end

  def kill_game_container(game_name) do
    System.cmd("docker", ["rm", "-f", game_name])
  end

  # SERVER
  def init(state \\ []) do
    Process.send_after(self(), :tick_game_containers, 1000)
    {:ok, state}
  end

  def handle_cast({:add_game, game_name}, state) do
    {:noreply, [[game_name, @game_timeout] | state]}
  end

  def handle_info(:tick_game_containers, state) do
    ticked_games =
      state
      |> Enum.reduce(
        [],
        fn game, acc ->
          game_name = List.first(game)
          time = List.last(game)

          if time <= 0 do
            kill_game_container(game_name)
            acc
          else
            [[game_name, time - 1] | acc]
          end
        end
      )

    Process.send_after(self(), :tick_game_containers, 1000)
    {:noreply, ticked_games}
  end
end
