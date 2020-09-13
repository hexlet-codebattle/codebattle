alias Codebattle.Repo
levels = ["elementary", "easy", "medium", "hard"]

1..3
|> Enum.each(fn x ->
  for level <- levels do
    task_name = "task_#{level}_#{:crypto.strong_rand_bytes(10) |> Base.encode32()}"

    task_data = %Codebattle.Task{
      name: task_name,
      description: "test sum: for ruby `def solution(a,b); a+b;end;`",
      asserts: "{\"arguments\":[1,1],\"expected\":2}\n{\"arguments\":[2,2],\"expected\":4}\n",
      disabled: false,
      input_signature: [
        %{"argument-name" => "a", "type" => %{"name" => "integer"}},
        %{"argument-name" => "b", "type" => %{"name" => "integer"}}
      ],
      output_signature: %{"type" => %{"name" => "integer"}}
    }

    task = Codebattle.Task.changeset(Map.merge(task_data, %{level: level})) |> Repo.insert!()

    playbook_data = %{
      players: [%{id: 2, total_time_ms: 5_000, editor_lang: "ruby", editor_text: ""}],
      records: [
        %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
        %{
          "diff" => %{
            "delta" => [%{"insert" => "def solution()\n\nend"}],
            "next_lang" => "ruby",
            "time" => 0
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 13}, %{"insert" => "a"}],
            "next_lang" => "ruby",
            "time" => 2058
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 14}, %{"insert" => ","}],
            "next_lang" => "ruby",
            "time" => 145
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 15}, %{"insert" => "b"}],
            "next_lang" => "ruby",
            "time" => 725
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 19}, %{"insert" => "\n"}],
            "next_lang" => "ruby",
            "time" => 620
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 18}, %{"insert" => "a"}],
            "next_lang" => "ruby",
            "time" => 593
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 19}, %{"insert" => " "}],
            "next_lang" => "ruby",
            "time" => 329
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 20}, %{"insert" => "+"}],
            "next_lang" => "ruby",
            "time" => 500
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 21}, %{"insert" => " "}],
            "next_lang" => "ruby",
            "time" => 251
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 22}, %{"insert" => "b"}],
            "next_lang" => "ruby",
            "time" => 183
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{"type" => "game_over", "id" => 2, "lang" => "ruby"}
      ]
    }

    Repo.insert!(%Codebattle.Bot.Playbook{
      data: playbook_data,
      task: task,
      winner_lang: "ruby",
      winner_id: 2,
      is_complete_solution: true
    })

    IO.puts("Upsert #{task_name}")
  end
end)

creator = Repo.get!(Codebattle.User, -15)

%Codebattle.Tournament{}
|> Codebattle.Tournament.changeset(%{
  name: "Codebattle Hexlet summer tournament 2019",
  state: "finished",
  creator: creator,
  default_language: "clojure",
  players_count: 16,
  diffculty: "elementary",
  starts_at: ~N[2019-08-22 19:33:08.910767]
})
|> Codebattle.Repo.insert!()
