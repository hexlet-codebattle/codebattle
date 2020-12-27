defmodule CodebattleWeb.Factory do
  use ExMachina.Ecto, repo: Codebattle.Repo

  alias Codebattle.{User, Game, Task, UserGame}
  alias Codebattle.Bot.Playbook
  alias Ueberauth.Auth

  def user_factory do
    %User{
      name: sequence(:username, &"User #{&1}"),
      email: sequence(:username, &"test#{&1}@test.io"),
      rating: 123,
      github_id: :rand.uniform(9_999_999),
      sound_settings: %User.SoundSettings{}
    }
  end

  def game_factory do
    %Game{
      state: "waiting_opponent",
      level: "elementary",
      type: "public",
      starts_at: TimeHelper.utc_now(),
      finishs_at: TimeHelper.utc_now(),
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
      description: "test sum",
      level: "easy",
      asserts:
        "{\"arguments\":[1,1],\"expected\":2}\n{\"arguments\":[2,2],\"expected\":4}\n{\"arguments\":[1,3],\"expected\":4}\n",
      input_signature: [
        %{"argument-name" => "a", "type" => %{"name" => "integer"}},
        %{"argument-name" => "b", "type" => %{"name" => "integer"}}
      ],
      output_signature: %{"type" => %{"name" => "integer"}},
      disabled: false
    }
  end

  def task_vectors_factory do
    %Task{
      name: Base.encode16(:crypto.strong_rand_bytes(2)),
      description: "test sum",
      level: "easy",
      asserts:
        "{\"arguments\":[[\"a\", \"b\", \"c\"], [\"d\", \"e\", \"f\"]],\"expected\":[\"abcdef\"]}\n",
      input_signature: [
        %{
          "argument-name" => "a",
          "type" => %{"name" => "array", "nested" => %{"name" => "string"}}
        },
        %{
          "argument-name" => "b",
          "type" => %{"name" => "array", "nested" => %{"name" => "string"}}
        }
      ],
      output_signature: %{
        "type" => %{"name" => "array", "nested" => %{"name" => "string"}}
      },
      disabled: false
    }
  end

  def playbook_factory do
    %Playbook{}
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
end
