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
      input_signature: [
        %{"argument-name" => "a", "type" => %{"name" => "integer"}},
        %{"argument-name" => "b", "type" => %{"name" => "integer"}}
      ],
      output_signature: %{"type" => %{"name" => "integer"}}
    }

    task = Codebattle.Task.changeset(Map.merge(task_data, %{level: level})) |> Repo.insert!()

    playbook_data = %{
      players: [%{ id: 2, total_time_ms: 5_000, editor_lang: "ruby", editor_text: ""}],
      records: [
        %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
        %{
          "diff" => %{"delta" => [%{"insert" => "def solution()\n\nend"}], "time" => 0},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"prev_lang" => "ruby", "next_lang" => "ruby", "time" => 24},
          "type" => "editor_lang",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 13}, %{"insert" => "a"}], "time" => 2058},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 14}, %{"insert" => ","}], "time" => 145},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 15}, %{"insert" => "b"}], "time" => 725},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 19}, %{"insert" => "\n"}], "time" => 620},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 18}, %{"insert" => "a"}], "time" => 593},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 19}, %{"insert" => " "}], "time" => 329},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 20}, %{"insert" => "+"}], "time" => 500},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 21}, %{"insert" => " "}], "time" => 251},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 22}, %{"insert" => "b"}], "time" => 183},
          "type" => "editor_text",
          "id" => 2
        },
        %{"type" => "check_complete", "id" => 2, "lang" => "ruby"}
      ]
    }

    Repo.insert!(%Codebattle.Bot.Playbook{data: playbook_data, task: task, winner_lang: "ruby", winner_id: 2})

    IO.puts("Upsert #{task_name}")
  end
end)

%Codebattle.Tournament{}
|> Codebattle.Tournament.changeset(%{
  name: "Codebattle Hexlet summer tournament 2019",
  creator_id: 1,
  players_count: 16,
  starts_at: ~N[2019-08-22 19:33:08.910767]
})
|> Codebattle.Repo.insert!()
