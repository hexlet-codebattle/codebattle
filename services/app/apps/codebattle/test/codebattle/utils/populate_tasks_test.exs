defmodule Codebattle.Utils.PopulateTasksTest do
  use Codebattle.DataCase, async: true

  test "from_dir!" do
    dir = Temp.mkdir!()

    task1 = """
    {
      "name": "testtask1",
      "level": "elementary",
      "examples": "none",
      "origin": "user",
      "state": "active",
      "description_ru": "",
      "description_en": "none",
      "tags": [],
      "visibility": "public",
      "input_signature": [{
        "argument_name": "ping",
        "type": {
          "name": "string"
        }
      }],
      "output_signature": {
        "type": {
          "name": "string"
        }
      },
      "asserts": [{
        "arguments": "ping",
        "expected": "pong"
      }]
    }
    """

    task2 = """
    {
      "name": "testtask2",
      "level": "medium",
      "examples": "none",
      "origin": "user",
      "state": "active",
      "description_ru": "",
      "description_en": "none",
      "tags": [],
      "visibility": "public",
      "input_signature": [{
        "argument_name": "ping",
        "type": {
          "name": "string"
        }
      }],
      "output_signature": {
        "type": {
          "name": "string"
        }
      },
      "asserts": [{
        "arguments": "ping",
        "expected": "pong"
      }]
    }
    """

    dir
    |> Path.join("task1.json")
    |> File.write!(task1)

    dir
    |> Path.join("task2.json")
    |> File.write!(task2)

    assert Codebattle.Utils.PopulateTasks.from_dir!(dir) == :ok
    assert %{name: "testtask2"} = Codebattle.Task |> Ecto.Query.where(name: "testtask2") |> Codebattle.Repo.one!()
  end
end
