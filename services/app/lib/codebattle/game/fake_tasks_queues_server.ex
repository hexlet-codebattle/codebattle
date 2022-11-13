defmodule Codebattle.Game.FakeTasksQueuesServer do
  alias Codebattle.Repo

  def get_task(level) do
    case Codebattle.Task.get_shuffled_task_ids(level) do
      [id | _] ->
        Repo.get(Codebattle.Task, id)

      [] ->
        %Codebattle.Task{
          name: "test_task",
          description_en: "test sum",
          description_ru: "проверка суммы",
          level: level,
          asserts: [
            %{arguments: [1, 1], expected: 2},
            %{arguments: [2, 1], expected: 3},
            %{arguments: [3, 2], expected: 5}
          ],
          input_signature: [
            %{argument_name: "a", type: %{name: "integer"}},
            %{argument_name: "b", type: %{name: "integer"}}
          ],
          output_signature: %{type: %{name: "integer"}},
          state: "active",
          visibility: "public",
          origin: "user",
          disabled: false,
          examples: "asfd"
        }
    end
  end
end
