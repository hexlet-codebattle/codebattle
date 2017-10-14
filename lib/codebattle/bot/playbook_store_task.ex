defmodule Codebattle.Bot.PlaybookStoreTask do
  @moduledoc """
  Task for async storing playbooks of winners
  """

  def start_link(params) do
    Task.start_link(__MODULE__, :run, [params])
  end

  def run(params) do
    if params.user_id != 0 do
      %Codebattle.Bot.Playbook{
        data: %{playbook: params.diff},
        task_id: params.task_id,
        user_id: params.user_id,
        game_id: params.game_id,
      }
      |> Codebattle.Repo.insert()
    end
  end
end
