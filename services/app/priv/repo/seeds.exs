alias Codebattle.Repo
alias Codebattle.{Game, User, UserGame}

levels = ["elementary", "easy", "medium", "hard"]
creator = Repo.get!(Codebattle.User, -15)

1..3
|> Enum.each(fn x ->
  for level <- levels do
    task_params = %{
      level: level,
      name: "task_#{level}_#{x}",
      tags: Enum.take_random(["math", "lol", "kek", "asdf"], 3),
      origin: "github",
      state: "active",
      visibility: "public",
      description_en: "test sum",
      description_ru: "проверка суммирования",
      examples: "```\n2 == solution(1,1)\n10 == solution(9,1)\n```",
      asserts: [
        %{
          arguments: [
            1,
            1,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 2
        },
        %{
          arguments: [
            2,
            2,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 4
        },
        %{
          arguments: [
            1,
            2,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 3
        },
        %{
          arguments: [
            3,
            2,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 5
        },
        %{
          arguments: [
            5,
            1,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 6
        },
        %{
          arguments: [
            1,
            1,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 2
        },
        %{
          arguments: [
            2,
            2,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 4
        },
        %{
          arguments: [
            1,
            2,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 3
        },
        %{
          arguments: [
            3,
            2,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 5
        },
        %{
          arguments: [
            5,
            1,
            "a",
            1.3,
            true,
            %{key1: "val1", key2: "val2"},
            ["asdf", "fdsa"],
            [["Jack", "Alice"]]
          ],
          expected: 6
        }
      ],
      disabled: false,
      input_signature: [
        %{argument_name: "a", type: %{name: "integer"}},
        %{argument_name: "b", type: %{name: "integer"}},
        %{argument_name: "c", type: %{name: "string"}},
        %{argument_name: "d", type: %{name: "float"}},
        %{argument_name: "e", type: %{name: "boolean"}},
        %{
          argument_name: "f",
          type: %{name: "hash", nested: %{name: "string"}}
        },
        %{
          argument_name: "g",
          type: %{name: "array", nested: %{name: "string"}}
        },
        %{
          argument_name: "h",
          type: %{
            name: "array",
            nested: %{name: "array", nested: %{name: "string"}}
          }
        }
      ],
      output_signature: %{type: %{name: "integer"}}
    }

    task = Codebattle.Task.upsert!(task_params)

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

    Repo.insert!(%Codebattle.Playbook{
      data: playbook_data,
      task: task,
      winner_lang: "ruby",
      winner_id: 2,
      solution_type: "complete"
    })
  end
end)

%Codebattle.Tournament{}
|> Codebattle.Tournament.changeset(%{
  name: "Codebattle Hexlet summer tournament 2019",
  state: "finished",
  creator: creator,
  default_language: "clojure",
  players_count: 16,
  difficulty: "elementary",
  starts_at: ~N[2019-08-22 19:33:08.910767]
})
|> Repo.insert!()

now = Timex.now()
one_month_ago = Timex.shift(now, months: -1)
two_weeks_ago = Timex.shift(now, weeks: -2)
five_days_ago = Timex.shift(now, days: -5)
six_hours_ago = Timex.shift(now, hours: -6)

[one_month_ago, two_weeks_ago, five_days_ago, six_hours_ago]
|> Enum.each(fn t ->
  game_params = %{
    state: "game_over",
    level: "easy",
    type: "duo",
    mode: "standard",
    visibility_type: "public",
    starts_at: t |> Timex.to_naive_datetime() |> NaiveDateTime.truncate(:second),
    finishes_at: t |> Timex.to_naive_datetime() |> NaiveDateTime.truncate(:second),
    inserted_at: TimeHelper.utc_now(),
    updated_at: TimeHelper.utc_now()
  }

  {:ok, game} =
    %Game{}
    |> Game.changeset(game_params)
    |> Repo.insert()

  user_1_params = %{
    name: "User1_#{Timex.format!(t, "%FT%T%:z", :strftime)}",
    is_bot: false,
    rating: 1300,
    email: "#{Timex.format!(t, "%FT%T%:z", :strftime)}@user1",
    lang: "ruby",
    github_id: 35_539_033,
    inserted_at: TimeHelper.utc_now(),
    updated_at: TimeHelper.utc_now()
  }

  {:ok, user_1} =
    %User{}
    |> User.changeset(user_1_params)
    |> Repo.insert()

  user_2_params = %{
    name: "User2_#{Timex.format!(t, "%FT%T%:z", :strftime)}",
    is_bot: false,
    rating: -500,
    email: "#{Timex.format!(t, "%FT%T%:z", :strftime)}@user2",
    lang: "java",
    github_id: 35_539_033,
    inserted_at: TimeHelper.utc_now(),
    updated_at: TimeHelper.utc_now()
  }

  {:ok, user_2} =
    %User{}
    |> User.changeset(user_2_params)
    |> Repo.insert()

  user_game_1_params = %{
    game_id: game.id,
    user_id: user_1.id,
    result: "won",
    creator: true,
    rating: user_1.rating + 32,
    rating_diff: 32,
    lang: user_1.lang
  }

  {:ok, user_game_1_params} =
    %UserGame{}
    |> UserGame.changeset(user_game_1_params)
    |> Repo.insert()

  user_game_2_params = %{
    game_id: game.id,
    user_id: user_2.id,
    result: "lost",
    creator: false,
    rating: user_2.rating - 32,
    rating_diff: -32,
    lang: user_2.lang
  }

  {:ok, user_game_2_params} =
    %UserGame{}
    |> UserGame.changeset(user_game_2_params)
    |> Repo.insert()
end)

task_ids =
  Codebattle.Task
  |> Repo.all()
  |> Enum.map(& &1.id)

%Codebattle.TaskPack{
  name: "All_tasks_at#{now}",
  visibility: "public",
  state: "active",
  task_ids: task_ids
}
|> Repo.insert!()
