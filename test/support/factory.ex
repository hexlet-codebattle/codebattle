defmodule CodebattleWeb.Factory do
  use ExMachina.Ecto, repo: Codebattle.Repo

  alias Codebattle.{User, Game}
  alias Ueberauth.Auth

  def user_factory do
    %User{
      name: sequence(:username, &"User #{&1}"),
      email: "test@test.io",
      github_id: :rand.uniform(9_999_999)
    }
  end

  def game_factory do
    %Game{state: "initial"}
  end

  def auth_factory do
    %Auth{
      provider: :github,
      uid: :rand.uniform(100_000),
      extra: %{
        raw_info: %{
          user: %{},
        },
      },
    }
  end
end
