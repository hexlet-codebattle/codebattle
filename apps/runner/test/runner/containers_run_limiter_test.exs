defmodule Runner.StateContainersRunLimiterTest do
  use ExUnit.Case, async: false

  alias Runner.StateContainersRunLimiter, as: Limiter

  setup do
    original_limit = Application.get_env(:runner, :max_parallel_containers_run)
    Application.put_env(:runner, :max_parallel_containers_run, 1)

    on_exit(fn -> Application.put_env(:runner, :max_parallel_containers_run, original_limit) end)
  end

  test "queues runs above the limit and promotes the next run when a slot opens" do
    assert {:ok, initial_state} = Limiter.init()

    assert {:reply, {:ok, first_id}, one_running} =
             Limiter.handle_call({:registry, {"ruby", 60_000}}, self(), initial_state)

    assert {:reply, {:ok, second_id}, one_waiting} =
             Limiter.handle_call({:registry, {"js", 60_000}}, self(), one_running)

    assert first_id != second_id

    assert {:reply, {:ok, :run}, ^one_waiting} =
             Limiter.handle_call({:check_run_status, first_id}, self(), one_waiting)

    assert {:reply, {:ok, {:wait, 500}}, ^one_waiting} =
             Limiter.handle_call({:check_run_status, second_id}, self(), one_waiting)

    assert {:noreply, promoted} = Limiter.handle_cast({:unregistry, first_id}, one_waiting)

    assert {:reply, {:ok, :run}, ^promoted} =
             Limiter.handle_call({:check_run_status, second_id}, self(), promoted)

    assert {:noreply, empty} = Limiter.handle_info({:unregistry, second_id}, promoted)
    assert empty.count == 0
    assert MapSet.size(empty.executed_set) == 0
    assert :queue.is_empty(empty.waiting_queue)
  end

  test "unregistering an unknown run is harmless" do
    assert {:ok, state} = Limiter.init([])
    assert {:noreply, ^state} = Limiter.handle_cast({:unregistry, "missing"}, state)
  end

  test "keeps waiting runs queued when unregistering does not open a slot" do
    state = %{
      count: 2,
      executed_set: MapSet.new(["running"]),
      waiting_queue: :queue.from_list(["waiting"])
    }

    assert {:noreply, ^state} = Limiter.handle_cast({:unregistry, "missing"}, state)
  end

  test "checks run status through the registered server" do
    assert Limiter.check_run_status("missing") == {:ok, {:wait, 500}}
  end
end
