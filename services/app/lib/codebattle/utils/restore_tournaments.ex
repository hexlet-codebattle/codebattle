defmodule Codebattle.Utils.RestoreTournaments do
  use GenServer

  @init_timeout :timer.seconds(3)

  def start_link(_) do
    GenServer.start(__MODULE__, [], name: __MODULE__)
  end

  def init(state \\ []) do
    Process.send_after(self(), :restore_from_db, @init_timeout)
    {:ok, state}
  end

  def handle_info(:restore_from_db, state) do
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

    Process.send_after(self(), :check_game_containers, 10_000)
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
