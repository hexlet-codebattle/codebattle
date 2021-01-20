alias Codebattle.Repo
alias Codebattle.{Game, User, UserGame}

levels = ["elementary", "easy", "medium", "hard"]

1..3
|> Enum.each(fn x ->
  for level <- levels do
    task_name = "task_#{level}_#{:crypto.strong_rand_bytes(10) |> Base.encode32()}"

    task_data = %Codebattle.Task{
      name: task_name,
      description: "test sum: for ruby `def solution(a,b); a+b;end;`",
      asserts: "{\"arguments\":[1,1],\"expected\":2}\n{\"arguments\":[2,2],\"expected\":4}\n{\"arguments\":[1,2],\"expected\":3}\n{\"arguments\":[3,2],\"expected\":5}\n{\"arguments\":[5,1],\"expected\":6}\n{\"arguments\":[1,1],\"expected\":2}\n{\"arguments\":[2,2],\"expected\":4}\n{\"arguments\":[1,2],\"expected\":3}\n{\"arguments\":[3,2],\"expected\":5}\n{\"arguments\":[5,1],\"expected\":6}\n",
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
    type: "public",
    starts_at: t |> Timex.to_naive_datetime() |> NaiveDateTime.truncate(:second),
    finishs_at: t |> Timex.to_naive_datetime() |> NaiveDateTime.truncate(:second),
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
