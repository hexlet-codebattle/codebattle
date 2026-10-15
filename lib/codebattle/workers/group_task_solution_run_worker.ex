defmodule Codebattle.Workers.GroupTaskSolutionRunWorker do
  @moduledoc """
  Executes the runner phase of a group task submission asynchronously.
  The pending run rows and "pending" broadcast are created synchronously
  at submission time (so the user sees the try immediately); this worker
  picks up the runner call + "finished" broadcast.
  """

  use Oban.Worker, max_attempts: 3

  alias Codebattle.GroupTask.Context, as: GroupTaskContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"group_task_id" => group_task_id, "run_key" => run_key} = args}) do
    attrs = Map.get(args, "attrs", %{})

    case GroupTaskContext.finalize_group_task_run_by_key(group_task_id, run_key, attrs) do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end
end
