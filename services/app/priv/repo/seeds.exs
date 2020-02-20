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
      meta: %{total_time_ms: 5_000, init_lang: "ruby" },
      playbook: [
        %{"time" => 0, "delta" => [%{"insert" => "def solution()\n\nend"}]},
        %{"lang" => "ruby", "time" => 24},
        %{"time" => 2058, "delta" => [%{"retain" => 13}, %{"insert" => "a"}]},
        %{"time" => 145, "delta" => [%{"retain" => 14}, %{"insert" => ","}]},
        %{"time" => 725, "delta" => [%{"retain" => 15}, %{"insert" => "b"}]},
        %{"time" => 620, "delta" => [%{"retain" => 19}, %{"insert" => "\n"}]},
        %{"time" => 593, "delta" => [%{"retain" => 18}, %{"insert" => "a"}]},
        %{"time" => 329, "delta" => [%{"retain" => 19}, %{"insert" => " "}]},
        %{"time" => 500, "delta" => [%{"retain" => 20}, %{"insert" => "+"}]},
        %{"time" => 251, "delta" => [%{"retain" => 21}, %{"insert" => " "}]},
        %{"time" => 183, "delta" => [%{"retain" => 22}, %{"insert" => "b"}]}
      ]
    }

    Repo.insert!(%Codebattle.Bot.Playbook{data: playbook_data, task: task, lang: "ruby"})

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
