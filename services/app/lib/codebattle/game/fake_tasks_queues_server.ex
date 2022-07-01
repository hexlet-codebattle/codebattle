defmodule Codebattle.Game.FakeTasksQueuesServer do
  import Ecto.Query

  alias Codebattle.Repo

  def get_task(level) do
    from(t in Codebattle.Task, where: t.level == ^level, limit: 1) |> Repo.one() ||
      %Codebattle.Task{
        name: Base.encode16(:crypto.strong_rand_bytes(2)),
        description_en: "test sum",
        description_ru: "проверка суммы",
        level: level,
        asserts: [
          %{arguments: [1, 1], expected: 2},
          %{arguments: [2, 1], expected: 3},
          %{arguments: [3, 2], expected: 5}
        ],
        input_signature: [
          %{"argument-name" => "a", "type" => %{"name" => "integer"}},
          %{"argument-name" => "b", "type" => %{"name" => "integer"}}
        ],
        output_signature: %{"type" => %{"name" => "integer"}},
        state: "active",
        visibility: "public",
        origin: "user",
        disabled: false,
        examples: "asfd"
      }
  end
end
