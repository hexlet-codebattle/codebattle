defmodule Codebattle.Repo.Migrations.CreateBots2 do
  use Ecto.Migration

  alias Codebattle.Repo
  alias Codebattle.User

  def change do
    utc_now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    bots = [
      %{
        id: -5,
        name: "ValyaFront",
        is_bot: true,
        rating: 1100,
        email: "valya@valya.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -6,
        name: "IgorElixir",
        is_bot: true,
        rating: 1100,
        email: "igor@igor.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -7,
        name: "VadimFront",
        is_bot: true,
        rating: 1300,
        email: "VadimFront@VadimFront.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -8,
        name: "VitalikFront",
        is_bot: true,
        rating: 1300,
        email: "Vitalik@Vitalik.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -9,
        name: "UlaBack",
        is_bot: true,
        rating: 1300,
        email: "UlaBack@UlaBack.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -10,
        name: "ShuhratOnRails",
        is_bot: true,
        rating: 1300,
        email: "ShuhratOnRails@ShuhratOnRails.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -11,
        name: "EvgenyKoa",
        is_bot: true,
        rating: 1300,
        email: "EvgenyKoa@EvgenyKoa.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -12,
        name: "EvgenyThePry",
        is_bot: true,
        rating: 1300,
        email: "EvgenyThePry@EvgenyThePry.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -13,
        name: "KolyaKot",
        is_bot: true,
        rating: 1300,
        email: "KolyaKot@KolyaKot.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -14,
        name: "SergeyStartCode",
        is_bot: true,
        rating: 1300,
        email: "SergeyStartCode@SergeyStartCode.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      }
    ]

    Repo.insert_all(User, bots)
  end
end
