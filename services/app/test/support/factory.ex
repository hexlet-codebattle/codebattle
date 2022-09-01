defmodule CodebattleWeb.Factory do
  use ExMachina.Ecto, repo: Codebattle.Repo

  alias Codebattle.{User, Game, Task, TaskPack, UserGame}
  alias Codebattle.Playbook
  alias Ueberauth.Auth

  def user_factory do
    %User{
      id: :rand.uniform(9_999_999),
      name: sequence(:username, &"User #{&1}"),
      email: sequence(:username, &"test#{&1}@test.io"),
      rating: 123,
      github_id: :rand.uniform(9_999_999),
      github_name: sequence(:github_name, &"github_name#{&1}"),
      discord_id: :rand.uniform(9_999_999),
      discord_name: sequence(:discord_name, &"discord_name#{&1}"),
      discord_avatar: sequence(:discord_avatar, &"discord_avatar#{&1}"),
      sound_settings: %User.SoundSettings{}
    }
  end

  def admin_factory do
    %User{
      id: 1_984_198_419,
      name: "admin",
      email: sequence(:username, &"test#{&1}@test.io"),
      rating: 123,
      github_id: :rand.uniform(9_999_999),
      github_name: sequence(:github_name, &"github_name#{&1}"),
      discord_id: :rand.uniform(9_999_999),
      discord_name: sequence(:discord_name, &"discord_name#{&1}"),
      discord_avatar: sequence(:discord_avatar, &"discord_avatar#{&1}"),
      sound_settings: %User.SoundSettings{}
    }
  end

  def game_factory do
    %Game{
      state: "waiting_opponent",
      level: "elementary",
      type: "public",
      starts_at: TimeHelper.utc_now(),
      finishes_at: TimeHelper.utc_now(),
      task: insert(:task)
    }
  end

  def user_game_factory do
    %UserGame{
      result: "won",
      user: build(:user)
    }
  end

  def task_factory do
    %Task{
      name: Base.encode16(:crypto.strong_rand_bytes(2)),
      description_en: "test sum",
      description_ru: "проверка суммы",
      level: "easy",
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

  def task_with_all_data_types_factory do
    %Task{
      name: Base.encode16(:crypto.strong_rand_bytes(2)),
      description_en: "test sum",
      level: "easy",
      asserts: [
        %{
          arguments: [1, "a", 1.3, true, %{a: "b", c: "d"}, ["d", "e"], [["Jack", "Alice"]]],
          expected: ["asdf"]
        }
      ],
      input_signature: [
        %{
          argument_name: "a",
          type: %{name: "integer"}
        },
        %{
          argument_name: "text",
          type: %{name: "string"}
        },
        %{
          argument_name: "b",
          type: %{name: "float"}
        },
        %{
          argument_name: "c",
          type: %{name: "boolean"}
        },
        %{
          argument_name: "nested_hash_of_string",
          type: %{name: "hash", nested: %{name: "string"}}
        },
        %{
          argument_name: "nested_array_of_string",
          type: %{name: "array", nested: %{name: "string"}}
        },
        %{
          argument_name: "nested_array_of_array_of_strings",
          type: %{
            name: "array",
            nested: %{name: "array", nested: %{name: "string"}}
          }
        }
      ],
      output_signature: %{
        type: %{name: "array", nested: %{name: "string"}}
      },
      disabled: false
    }
  end

  def task_pack_factory do
    %TaskPack{
      name: sequence(:taskpack, &"Pack #{&1}"),
      visibility: "public",
      state: "active"
    }
  end

  def playbook_factory do
    %Playbook{
      winner_id: 0,
      winner_lang: "ruby",
      solution_type: "complete",
      data: %{
        players: [%{id: 0, total_time_ms: 5_000, editor_lang: "ruby", editor_text: ""}],
        records: [
          %{"type" => "init", "id" => 0, "editor_text" => "", "editor_lang" => "ruby"},
          %{
            "diff" => %{
              "delta" => [%{"insert" => "def solution()\n\nend"}],
              "next_lang" => "ruby",
              "time" => 0
            },
            "type" => "update_editor_data",
            "id" => 0
          },
          %{"type" => "game_over", "id" => 0, "lang" => "ruby"}
        ]
      }
    }
  end

  def tournament_factory do
    %Codebattle.Tournament{
      type: "individual",
      name: "name",
      step: 0,
      players_count: 16,
      starts_at: NaiveDateTime.utc_now(),
      creator_id: 1,
      data: %{players: [], matches: []}
    }
  end

  def team_tournament_factory do
    %Codebattle.Tournament{
      type: "team",
      name: "name",
      step: 0,
      players_count: 16,
      starts_at: NaiveDateTime.utc_now(),
      creator_id: 1,
      data: %{players: [], matches: []},
      meta: %{
        teams: [
          %{id: 0, title: "frontend"},
          %{id: 1, title: "backend"}
        ]
      }
    }
  end

  def stairway_tournament_factory do
    %Codebattle.Tournament{
      type: "stairway",
      name: "Stairway tournament",
      step: 0,
      players_count: 16,
      starts_at: NaiveDateTime.utc_now(),
      creator_id: 1,
      data: %{players: [], matches: []},
      meta: %{}
    }
  end

  def token_tournament_factory do
    %Codebattle.Tournament{
      type: "individual",
      access_type: "token",
      access_token: "asdfasdfasdf",
      name: "name",
      step: 0,
      players_count: 16,
      starts_at: NaiveDateTime.utc_now(),
      creator_id: 1,
      data: %{players: [], matches: []}
    }
  end

  def auth_factory do
    %Auth{
      provider: :github,
      uid: :rand.uniform(100_000),
      extra: %{
        raw_info: %{
          user: :user
        }
      }
    }
  end

  def invite_factory do
    %Codebattle.Invite{}
  end
end
