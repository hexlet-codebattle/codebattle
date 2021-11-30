defmodule Codebattle.Game.FakeTasksQueuesServer do
  import Ecto.Query

  alias Codebattle.Repo

  def get_task(level) do
    from(t in Codebattle.Task, where: t.level == ^level) |> Repo.all() |> List.first() ||
      CodebattleWeb.Factory.build(:task, level: level)
  end
end
