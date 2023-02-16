defmodule Codebattle.Repo.Migrations.AddMoreBots2 do
  use Ecto.Migration

  def change do
    utc_now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    bots = [
      %{
        id: -28,
        name: "PavlutOnWire",
        is_bot: true,
        rating: 1200,
        email: "pavlut@on_wire.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -29,
        name: "ZhenyaGazprom",
        is_bot: true,
        rating: 1200,
        email: "zhenya@gazprom.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -30,
        name: "JulbelPhP",
        is_bot: true,
        rating: 1200,
        email: "julbel@php.bot_codebattle",
        lang: "php",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -31,
        name: "clojar05",
        is_bot: true,
        rating: 1300,
        email: "clojar05@solar.bot_codebattle",
        lang: "clojure",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -32,
        name: "leraValera",
        is_bot: true,
        rating: 1300,
        email: "lera@valera.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -33,
        name: "CasperDesigner",
        is_bot: true,
        rating: 1200,
        email: "casper@designer.bot_codebattle",
        lang: "elixir",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -34,
        name: "RedDevil",
        is_bot: true,
        rating: 1300,
        email: "red@devil.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -35,
        name: "VictorLebowski",
        is_bot: true,
        rating: 1200,
        email: "victor@lebowski.bot_codebattle",
        lang: "js",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -36,
        name: "Alisina",
        is_bot: true,
        rating: 1200,
        email: "alisina@hol.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -37,
        name: "Batya",
        is_bot: true,
        rating: 1300,
        email: "batya@hexlet.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -38,
        name: "VovaFullStack",
        is_bot: true,
        rating: 1200,
        email: "vova@fullStack.bot_codebattle",
        lang: "php",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -39,
        name: "StuffyDilshod",
        is_bot: true,
        rating: 1200,
        email: "Stuffy@Dilshod.bot_codebattle",
        lang: "haskell",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -40,
        name: "IvanNebot",
        is_bot: true,
        rating: 1200,
        email: "ivan@nebot.bot_codebattle",
        lang: "php",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -41,
        name: "UncleLesha",
        is_bot: true,
        rating: 1200,
        email: "uncle_lesha@nebot.bot_codebattle",
        lang: "elixir",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      }
    ]

    Codebattle.Repo.insert_all(Codebattle.User, bots)
  end
end
