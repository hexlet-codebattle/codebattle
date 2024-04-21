alias Codebattle.Clan
alias Codebattle.Game
alias Codebattle.Repo
alias Codebattle.User
alias Codebattle.UserGame
alias Codebattle.TaskPack

levels = ["elementary", "easy", "medium", "hard"]
creator = User.get!(1)

1..30
|> Enum.each(fn x ->
  for level <- levels do
    task_params = %{
      level: level,
      name: "task_#{level}_#{x}",
      tags:
        Enum.take_random(["math", "lol", "kek", "asdf", "strings", "hash-maps", "collections"], 3),
      origin: "github",
      state: "active",
      visibility: "public",
      description_en: "test sum",
      description_ru: "проверка суммирования",
      examples: "```\n2 == solution(1,1)\n10 == solution(9,1)\n```",
      asserts: [
        %{arguments: [1, 1], expected: 2},
        %{arguments: [2, 2], expected: 4},
        %{arguments: [1, 2], expected: 3},
        %{arguments: [3, 2], expected: 5},
        %{arguments: [5, 1], expected: 6},
        %{arguments: [10, 0], expected: 10},
        %{arguments: [20, 2], expected: 22},
        %{arguments: [10, 2], expected: 12},
        %{arguments: [30, 2], expected: 32},
        %{arguments: [50, 1], expected: 51}
      ],
      disabled: false,
      input_signature: [
        %{argument_name: "a", type: %{name: "integer"}},
        %{argument_name: "b", type: %{name: "integer"}}
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
      game_id: 1,
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
  players_limit: 16,
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
    avatar_url: "/assets/images/logo.svg",
    lang: "ruby",
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
    avatar_url: "/assets/images/logo.svg",
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

for level <- levels do
  task_ids =
    Codebattle.Task
    |> Repo.all()
    |> Enum.filter(&(&1.level == level))
    |> Enum.map(& &1.id)

  name = "all_#{level}"

  Repo.get_by(TaskPack, name: name) ||
    %TaskPack{
      creator_id: 1,
      name: name,
      visibility: "public",
      state: "active",
      task_ids: task_ids
    }
    |> TaskPack.changeset()
    |> Repo.insert!()

  name = "3_#{level}"

  Repo.get_by(TaskPack, name: name) ||
    %TaskPack{
      creator_id: 1,
      name: name,
      visibility: "public",
      state: "active",
      task_ids: Enum.take(task_ids, 3)
    }
    |> TaskPack.changeset()
    |> Repo.insert!()

  name = "10_#{level}"

  Repo.get_by(TaskPack, name: name) ||
    %TaskPack{
      creator_id: 1,
      name: name,
      visibility: "public",
      state: "active",
      task_ids: Enum.take(task_ids, 10)
    }
    |> TaskPack.changeset()
    |> Repo.insert!()
end

# Build users for load tests with clans
Enum.each(1..100, fn id ->
  Clan.find_or_create_by_clan("clan_#{id}", 1)
end)

tokens =
  Enum.map(1..70, fn id ->
    t = Timex.now()

    clan_id =
      50
      |> Statistics.Distributions.Normal.rand(7)
      |> round()
      |> min(100)
      |> max(1)
      |> to_string()

    params = %{
      name: "neBot_#{id}_#{Timex.format!(t, "%FT%T%:z", :strftime)}",
      clan: "clan_#{clan_id}",
      clan_id: clan_id,
      is_bot: false,
      rating: 1200,
      email: "#{Timex.format!(t, "%FT%T%:z", :strftime)}@user#{id}",
      lang: "rust",
      inserted_at: TimeHelper.utc_now(),
      updated_at: TimeHelper.utc_now()
    }

    {:ok, user} =
      %User{}
      |> User.changeset(params)
      |> Repo.insert()

    token = Phoenix.Token.sign(CodebattleWeb.Endpoint, "user_token", user.id)
    "#{user.id}:#{token}:js"
  end)

File.write!("/tmp/tokens.txt", Enum.join(tokens, "\n"))
