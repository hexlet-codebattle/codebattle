defmodule Runner.OperationalWorkersTest do
  use ExUnit.Case, async: false

  alias Runner.ImagesPuller
  alias Runner.StaleContainersKiller
  alias Runner.SystemMonitorLogger

  setup do
    original = %{
      command_runner: Application.get_env(:runner, :command_runner),
      command_stub_test_pid: Application.get_env(:runner, :command_stub_test_pid),
      images_pull_task: Application.get_env(:runner, :images_pull_task),
      os_command_runner: Application.get_env(:runner, :os_command_runner)
    }

    Application.put_env(:runner, :command_runner, Runner.CommandStub)
    Application.put_env(:runner, :command_stub_test_pid, self())
    Application.put_env(:runner, :images_pull_task, Runner.ImagesPullTaskStub)

    on_exit(fn ->
      Enum.each(original, fn
        {key, nil} -> Application.delete_env(:runner, key)
        {key, value} -> Application.put_env(:runner, key, value)
      end)
    end)
  end

  test "periodically invokes the configured image pull task" do
    assert {:ok, state} = ImagesPuller.init(:initial)
    assert state == :initial

    assert {:noreply, %{}} = ImagesPuller.handle_info(:start_pulling, state)
    assert_receive :images_pulled

    assert {:ok, pid} = ImagesPuller.start_link([])
    GenServer.stop(pid)
  end

  test "removes only stale game containers" do
    assert StaleContainersKiller.pull_game_info("container-id +0000 UTC") == "container-id"
    assert [stale, fresh] = StaleContainersKiller.list_containers()
    assert stale =~ ~r/^stale-id:::/
    assert fresh =~ ~r/^fresh-id:::/
    assert_receive :listed_containers

    assert {:noreply, :state} = StaleContainersKiller.handle_info(:check_game_containers, :state)
    assert_receive :listed_containers
    assert_receive {:removed_container, "stale-id"}
    refute_receive {:removed_container, "fresh-id"}

    assert StaleContainersKiller.kill_game_container("manual-id") == {"", 0}
    assert_receive {:removed_container, "manual-id"}

    assert StaleContainersKiller.kill() == :check_game_containers
    assert_receive :check_game_containers

    assert {:ok, state} = StaleContainersKiller.init(:initial)
    assert state == :initial

    assert {:ok, pid} = StaleContainersKiller.start_link([])
    GenServer.stop(pid)
  end

  test "logs CPU stats and handles malformed command output" do
    Application.put_env(:runner, :os_command_runner, Runner.OSCommandStub)
    Application.put_env(:runner, :os_command_output, ~c"85\n")

    assert SystemMonitorLogger.get_cpu() == 85
    assert {:noreply, :state} = SystemMonitorLogger.handle_info(:get_stats, :state)

    Application.put_env(:runner, :os_command_output, ~c"not-a-number")
    assert SystemMonitorLogger.get_cpu() == 0

    assert SystemMonitorLogger.get_stats() == :get_stats
    assert_receive :get_stats

    assert {:ok, state} = SystemMonitorLogger.init(:initial)
    assert state == :initial

    assert {:ok, pid} = SystemMonitorLogger.start_link([])
    GenServer.stop(pid)
  end
end

defmodule Runner.ImagesPullTaskStub do
  @moduledoc false
  def run(:start) do
    send(Application.fetch_env!(:runner, :command_stub_test_pid), :images_pulled)
  end
end

defmodule Runner.OSCommandStub do
  @moduledoc false
  def cmd(_command), do: Application.fetch_env!(:runner, :os_command_output)
end
