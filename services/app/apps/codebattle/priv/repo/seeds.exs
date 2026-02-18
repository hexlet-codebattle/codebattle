alias Codebattle.Clan
alias Codebattle.Event
alias Codebattle.Game
alias Codebattle.Repo
alias Codebattle.Season
alias Codebattle.TaskPack
alias Codebattle.Tournament.SeasonTournamentGenerator
alias Codebattle.User
alias Codebattle.UserEvent
alias Codebattle.UserGame

require Logger

levels = ["elementary", "easy", "medium", "hard"]

Enum.each(1..10, fn x ->
  for level <- levels do
    task_params = %{
      level: level,
      name: "task_#{level}_#{x}",
      tags: Enum.take_random(["math", "lol", "kek", "asdf", "strings", "hash-maps", "collections"], 3),
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

creator = %{
  name: "User1_admin#{Timex.format!(DateTime.utc_now(), "%FT%T%:z", :strftime)}",
  is_bot: false,
  rating: 1300,
  email: "admin@user1#{Timex.format!(DateTime.utc_now(), "%FT%T%:z", :strftime)}",
  avatar_url: "/assets/images/logo.svg",
  lang: "ruby",
  inserted_at: TimeHelper.utc_now(),
  updated_at: TimeHelper.utc_now()
}

now = DateTime.utc_now()
one_month_ago = Timex.shift(now, months: -1)
two_weeks_ago = Timex.shift(now, weeks: -2)
five_days_ago = Timex.shift(now, days: -5)
six_hours_ago = Timex.shift(now, hours: -6)

Enum.each([one_month_ago, two_weeks_ago, five_days_ago, six_hours_ago], fn t ->
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

  {:ok, _user_game_1_params} =
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

  {:ok, _user_game_2_params} =
    %UserGame{}
    |> UserGame.changeset(user_game_2_params)
    |> Repo.insert()
end)

for level <- levels do
  task_ids =
    Codebattle.Task
    |> Repo.all()
    |> Enum.filter(&(&1.level == level))
    |> Enum.filter(&String.starts_with?(&1.name, "task_#{level}"))
    |> Enum.map(& &1.id)

  name = "7_#{level}"

  Repo.get_by(TaskPack, name: name) ||
    %TaskPack{
      creator_id: 1,
      name: name,
      visibility: "public",
      state: "active",
      task_ids: Enum.take(task_ids, 7)
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

current_season =
  Season.get_current_season() ||
    (fn today ->
       year = today.year

       cond do
         Date.compare(today, Date.new!(year, 12, 21)) != :lt ->
           %Season{name: "1", year: year + 1, starts_at: Date.new!(year, 12, 21), ends_at: Date.new!(year + 1, 3, 21)}

         Date.compare(today, Date.new!(year, 9, 21)) != :lt ->
           %Season{name: "0", year: year, starts_at: Date.new!(year, 9, 21), ends_at: Date.new!(year, 12, 21)}

         Date.compare(today, Date.new!(year, 6, 21)) != :lt ->
           %Season{name: "3", year: year, starts_at: Date.new!(year, 6, 21), ends_at: Date.new!(year, 9, 21)}

         Date.compare(today, Date.new!(year, 3, 21)) != :lt ->
           %Season{name: "2", year: year, starts_at: Date.new!(year, 3, 21), ends_at: Date.new!(year, 6, 21)}

         true ->
           %Season{name: "1", year: year, starts_at: Date.new!(year - 1, 12, 21), ends_at: Date.new!(year, 3, 21)}
       end
     end).(Date.utc_today())

Logger.info("Generating tournaments for current season #{current_season.name} #{current_season.year}...")

current_season
|> SeasonTournamentGenerator.generate_season_tournaments()
|> Enum.each(fn changeset ->
  Repo.insert(changeset)
end)

try do
  tokens =
    Enum.map(1..2000, fn id ->
      t = DateTime.utc_now()

      clan_id =
        50
        |> Statistics.Distributions.Normal.rand(7)
        |> round()
        |> min(100)
        |> max(1)
        |> to_string()

      params = %{
        name: "rBot_#{id}_",
        clan: "clan_#{clan_id}",
        clan_id: clan_id,
        is_bot: false,
        rating: 1200,
        email: "#{Timex.format!(t, "%FT%T%:z", :strftime)}@user#{id}",
        lang: "python",
        inserted_at: TimeHelper.utc_now(),
        updated_at: TimeHelper.utc_now()
      }

      {:ok, user} =
        %User{}
        |> User.changeset(params)
        |> Repo.insert()

      token = Phoenix.Token.sign(CodebattleWeb.Endpoint, "user_token", user.id)
      "#{user.id}:#{token}:python"
    end)

  File.mkdir_p!("tmp")
  File.write!("tmp/tokens.txt", Enum.join(tokens, "\n"))
rescue
  e ->
    Logger.error("Error seeding tokens: #{inspect(e)}")
end

stages =
  [
    %{
      slug: "qualification",
      name: "Qualification",
      dates: "May 12-17",
      action_button_text: "Go",
      confirmation_text: "Confirm that you want to suffer 1 hour",
      status: :active,
      type: :tournament,
      playing_type: :single,
      tournament_meta: %{
        type: "swiss",
        rounds_limit: 7,
        access_type: "token",
        state: "waiting_participants",
        task_pack_name: "qualification",
        tournament_timeout_seconds: 75 * 60,
        players_limit: 128,
        ranking_type: "by_user",
        task_provider: "task_pack",
        task_strategy: "sequential"
      }
    },
    %{
      slug: "semifinal_entrance",
      name: "Semifinal Entrance",
      type: :entrance,
      status: :active
    },
    %{
      slug: "semifinal",
      name: "Semifinal",
      dates: "May 31",
      action_button_text: "Go",
      confirmation_text: "Confirm that you want to suffer 1 hour",
      status: :active,
      type: :tournament
    },
    %{
      slug: "final_entrance",
      name: "Final Entrance",
      type: :entrance,
      status: :active
    },
    %{
      slug: "final",
      name: "Final",
      action_button_text: "Go",
      confirmation_text: "Confirm that you want to suffer 1 hour",
      dates: "June 26",
      status: :active,
      type: :tournament
    }
  ]

# Create or find event
event_slug = "vibecoding-2025"

event_params = %{
  slug: event_slug,
  title: "Codebattle Hexlet summer",
  description: "Codebattle Hexlet summer",
  starts_at: ~N[2019-08-22 19:33:08.910767],
  finishes_at: ~N[2019-08-22 19:33:08.910767],
  stages: stages
}

case Repo.get_by(Event, slug: event_slug) do
  nil ->
    %Event{}
    |> Event.changeset(event_params)
    |> Repo.insert!()

  event ->
    event
    |> Event.changeset(event_params)
    |> Repo.update!()
end

# Create user_event records for all existing users
users = User |> Repo.all() |> Enum.filter(&(&1.id > 0))
events = Repo.all(Event)

if Enum.any?(events) do
  Enum.each(events, fn event ->
    Enum.each(users, fn user ->
      case UserEvent.get_by_user_id_and_event_id(user.id, event.id) do
        nil ->
          UserEvent.create(%{
            user_id: user.id,
            event_id: event.id,
            stages: [
              %{
                slug: "qualification",
                status: :pending,
                place_in_total_rank: nil,
                place_in_category_rank: nil,
                score: nil,
                wins_count: Enum.random(0..10),
                games_count: Enum.random(1..20),
                time_spent_in_seconds: Enum.random(100..10_000)
              },
              %{
                slug: "semifinal_entrance",
                entrance_result: :passed
              },
              %{
                slug: "semifinal",
                tournament_type: :global,
                status: :pending,
                place_in_total_rank: Enum.random(1..50),
                place_in_category_rank: Enum.random(1..25),
                score: Enum.random(10..100),
                wins_count: Enum.random(0..10),
                games_count: Enum.random(1..15),
                time_spent_in_seconds: Enum.random(100..8000)
              },
              %{
                slug: "final_entrance",
                entrance_result: :not_passed
              },
              %{
                slug: "final",
                status: :pending,
                place_in_total_rank: Enum.random(1..20),
                place_in_category_rank: Enum.random(1..10),
                score: Enum.random(20..100),
                wins_count: Enum.random(0..8),
                games_count: Enum.random(1..10),
                time_spent_in_seconds: Enum.random(100..5000)
              }
            ]
          })

        user_event ->
          IO.puts("User event already exists for user #{user.id} and event #{event.id}")
      end
    end)
  end)
else
  IO.puts("No events found in the database")
end

Repo.delete_all(UserEvent)

# UserEvent.create(%{
#   user_id: 2185,
#   event_id: 1,
#   stages: [
#     %{
#       slug: "qualification",
#       status: :completed,
#       place_in_total_rank: nil,
#       place_in_category_rank: nil,
#       score: nil,
#       wins_count: nil,
#       games_count: nil,
#       time_spent_in_seconds: nil
#     },
#     %{
#       slug: "semifinal_entrance",
#       entrance_result: :passed
#     },
#     %{
#       slug: "semifinal",
#       tournament_type: :global,
#       status: :pending
#     }
# %{
#   slug: "final_entrance",
#   entrance_result: :not_passed
# },
# %{
#   slug: "final",
#   status: :pending,
#   place_in_total_rank: Enum.random(1..20),
#   place_in_category_rank: Enum.random(1..10),
#   score: Enum.random(20..100),
#   wins_count: Enum.random(0..8),
#   games_count: Enum.random(1..10),
#   time_spent_in_seconds: Enum.random(100..5000)
# }
# ]
# })
#
seasons = [
  %{name: "0", year: 2025, starts_at: ~D[2025-09-21], ends_at: ~D[2025-12-21]},
  %{name: "1", year: 2026, starts_at: ~D[2025-12-21], ends_at: ~D[2026-03-21]},
  %{name: "2", year: 2026, starts_at: ~D[2026-03-21], ends_at: ~D[2026-06-21]},
  %{name: "3", year: 2026, starts_at: ~D[2026-06-21], ends_at: ~D[2026-09-21]},
  %{name: "0", year: 2026, starts_at: ~D[2026-09-21], ends_at: ~D[2026-12-21]},
  %{name: "1", year: 2027, starts_at: ~D[2026-12-21], ends_at: ~D[2027-03-21]}
]

created_seasons =
  Enum.map(seasons, fn season_params ->
    case Repo.get_by(Season, starts_at: season_params.starts_at) do
      nil ->
        {:ok, season} = Season.create(season_params)
        season

      existing ->
        existing
    end
  end)

# Generate rich tournament and season result data for testing charts
Logger.info("Generating season results data...")

# Get all users with clans (created earlier in seeds)
all_users =
  User
  |> Repo.all()
  |> Enum.filter(&(&1.id > 0 && !&1.is_bot))
  |> Enum.take(200)

# Programming languages for variety
languages = [
  "ruby",
  "python",
  "javascript",
  "elixir",
  "go",
  "rust",
  "java",
  "kotlin",
  "typescript",
  "cpp"
]

# Tournament grades with their point distributions
grade_configs = %{
  "rookie" => %{points: [8, 4, 2], max_players: 32},
  "challenger" => %{points: [16, 8, 4, 2], max_players: 64},
  "pro" => %{points: [128, 64, 32, 16, 8, 4, 2], max_players: 128},
  "elite" => %{points: [256, 128, 64, 32, 16, 8, 4, 2], max_players: 200},
  "masters" => %{points: [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2], max_players: 300},
  "grand_slam" => %{points: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2], max_players: 500}
}

# Helper to generate realistic score distributions
generate_score = fn place, total_players ->
  # Higher placed players get higher scores with some randomness
  base_score = max(1, total_players - place + 1) * 100
  variance = :rand.uniform(50) - 25
  max(0, base_score + variance)
end

# Helper to generate realistic game counts
generate_games = fn ->
  # Most players play 5-15 games per tournament
  5 + :rand.uniform(10)
end

# Helper to generate win counts based on place
generate_wins = fn place, games_count, total_players ->
  # Better placed players have higher win rates
  win_rate = max(0.1, 1.0 - place / total_players)
  adjusted_rate = win_rate * (0.7 + :rand.uniform() * 0.3)
  round(games_count * adjusted_rate)
end

# Helper to generate time spent
generate_time = fn games_count ->
  # Average 3-8 minutes per game
  games_count * (180 + :rand.uniform(300))
end

# Create finished tournaments and results for each season
Enum.each(created_seasons, fn season ->
  Logger.info("Generating data for season #{season.name} #{season.year}...")

  # Get season date range
  season_start = season.starts_at
  season_end = season.ends_at

  # Generate 8-15 tournaments per season with different grades
  tournaments_count = 8 + :rand.uniform(7)

  # Distribute tournaments across grades (more lower-tier tournaments)
  grade_distribution = [
    {"rookie", 3},
    {"challenger", 3},
    {"pro", 2},
    {"elite", 2},
    {"masters", 1},
    {"grand_slam", 1}
  ]

  tournament_grades =
    grade_distribution
    |> Enum.flat_map(fn {grade, count} -> List.duplicate(grade, count) end)
    |> Enum.shuffle()
    |> Enum.take(tournaments_count)

  # Create tournaments for this season
  Enum.with_index(tournament_grades, fn grade, idx ->
    # Calculate tournament date within season
    days_in_season = Date.diff(season_end, season_start)
    tournament_day = div(days_in_season * idx, tournaments_count)
    tournament_date = Date.add(season_start, tournament_day)

    tournament_datetime = DateTime.new!(tournament_date, ~T[18:00:00], "Etc/UTC")

    config = grade_configs[grade]

    # Create the tournament
    tournament_params = %{
      name: "#{String.capitalize(grade)} Tournament ##{idx + 1}",
      description: "#{String.capitalize(grade)} season tournament ##{idx + 1}",
      type: "swiss",
      state: "finished",
      grade: grade,
      starts_at: tournament_datetime,
      started_at: tournament_datetime,
      finished_at: DateTime.add(tournament_datetime, 3600, :second),
      players_limit: config.max_players,
      ranking_type: "by_user",
      score_strategy: "75_percentile",
      task_provider: "level",
      rounds_limit: 7,
      current_round_position: 7,
      creator_id: 1
    }

    {:ok, tournament} =
      %Codebattle.Tournament{}
      |> Codebattle.Tournament.changeset(tournament_params)
      |> Repo.insert()

    # Select random participants (30-80% of available users based on grade)
    participation_rate =
      case grade do
        "rookie" -> 0.3
        "challenger" -> 0.4
        "pro" -> 0.5
        "elite" -> 0.6
        "masters" -> 0.7
        "grand_slam" -> 0.8
      end

    participants =
      all_users
      |> Enum.shuffle()
      |> Enum.take(round(length(all_users) * participation_rate))

    total_participants = length(participants)

    # Create tournament_user_results for each participant
    participants
    |> Enum.with_index(1)
    |> Enum.each(fn {user, place} ->
      games_count = generate_games.()
      wins_count = generate_wins.(place, games_count, total_participants)
      score = generate_score.(place, total_participants)
      total_time = generate_time.(games_count)

      # Calculate points based on grade and place
      points_list = config.points
      points = Enum.at(points_list, place - 1) || 2

      # Get clan info
      clan = if user.clan_id, do: Repo.get(Clan, user.clan_id)

      result_params = %{
        tournament_id: tournament.id,
        user_id: user.id,
        user_name: user.name,
        user_lang: Enum.random(languages),
        clan_id: user.clan_id,
        clan_name: clan && clan.name,
        place: place,
        score: score,
        points: points,
        games_count: games_count,
        wins_count: wins_count,
        total_time: total_time,
        is_cheater: false,
        avg_result_percent: Decimal.new("#{50 + :rand.uniform(50)}.#{:rand.uniform(9)}"),
        inserted_at: NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)
      }

      Repo.insert_all(
        "tournament_user_results",
        [result_params],
        on_conflict: :nothing
      )
    end)

    Logger.info("  Created #{grade} tournament with #{total_participants} participants")
  end)

  # Aggregate season results
  Logger.info("  Aggregating season results...")
  Codebattle.SeasonResult.aggregate_season_results(season.id)
end)

Logger.info("Season data generation complete!")
