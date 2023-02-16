defmodule Codebattle.Repo.Migrations.CreateBots do
  use Ecto.Migration

  alias Codebattle.Repo
  alias Codebattle.User

  def change do
    utc_now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    bots = [
      %{
        id: -1,
        name: "DimaLol",
        is_bot: true,
        rating: 1100,
        email: "diman@lol.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -2,
        name: "DimaKek",
        is_bot: true,
        rating: 1100,
        email: "diman@kek.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -3,
        name: "AndreyDev",
        is_bot: true,
        rating: 1300,
        email: "andrey@dev.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -4,
        name: "AndreyFront",
        is_bot: true,
        rating: 1300,
        email: "andrey@front.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      }
    ]

    Repo.insert_all(User, bots)
  end
end
