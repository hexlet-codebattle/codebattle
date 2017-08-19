defmodule CodebattleWeb.Factory do
  use ExMachina.Ecto, repo: Codebattle.Repo

  alias Codebattle.User

  def user_factory do
    %User{
      name: sequence(:username, &"User #{&1}"),
      email: "test@test.io",
      github_id: :rand.uniform(9999999)
    }
  end
end
