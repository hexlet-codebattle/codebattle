defmodule Runner.StaleContainersKiller do
  use GenServer

  @game_timeout 30

  def start_link(_) do
    GenServer.start(__MODULE__, [], name: __MODULE__)
  end

  def init(state \\ []) do
    Process.send_after(self(), :check_game_containers, 1000)
    {:ok, state}
  end

  def handle_info(:check_game_containers, state) do
    list_containers()
    |> Enum.each(fn game ->
      [game_id, uptime] = String.split(game, ":::", trim: true)
      {:ok, converted_time} = NaiveDateTime.from_iso8601(uptime)
      time_diff = NaiveDateTime.diff(NaiveDateTime.utc_now(), converted_time)

      if time_diff > @game_timeout do
        kill_game_container(game_id)
      end

      [game_id, uptime]
    end)

    Process.send_after(self(), :check_game_containers, 7_000)
    {:noreply, state}
  end

  def kill_game_container(container_id) do
    System.cmd("docker", ["rm", "-f", container_id])
  end

  def pull_game_info(game) do
    [head | _] = String.split(game, " +", trum: true)
    head
  end

  def list_containers() do
    {containers, _} =
      System.cmd("docker", [
        "ps",
        "--filter",
        "label=codebattle_game",
        "--format",
        "{{.ID}}:::{{.CreatedAt}}"
      ])

    containers
    |> String.split("\n", trim: true)
    |> Enum.map(&pull_game_info/1)
  end
end
