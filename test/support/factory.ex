defmodule CodebattleWeb.Factory do
  use ExMachina.Ecto, repo: Codebattle.Repo

  alias Codebattle.{User, Game, Task}
  alias Codebattle.Bot.Playbook
  alias Ueberauth.Auth

  def user_factory do
    %User{
      name: sequence(:username, &"User #{&1}"),
      email:  sequence(:username, &"test#{&1}@test.io"),
      raiting:  123,
      github_id: :rand.uniform(9_999_999)
    }
  end

  def game_factory do
    %Game{state: "waiting_opponent"}
  end

  def task_factory do
    %Task{name: "task_name", description: "test_task", level: "hard", asserts: "{}\n{}"}
  end

  def bot_playbook_factory do
    %Playbook{}
  end

  def auth_factory do
    %Auth{
      provider: :github,
      uid: :rand.uniform(100_000),
      extra: %{
        raw_info: %{
          user: :user,
        },
      },
    }
  end
end
