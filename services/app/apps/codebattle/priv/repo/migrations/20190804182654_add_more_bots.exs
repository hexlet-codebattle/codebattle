defmodule Codebattle.Repo.Migrations.AddMoreBots do
  use Ecto.Migration

  def change do
    utc_now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    bots = [
      %{
        id: -15,
        name: "MityaCopywriter",
        is_bot: true,
        rating: 1200,
        email: "mitya@cprywriter.bot_codebattle",
        lang: "haskell",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -16,
        name: "Meldony",
        is_bot: true,
        rating: 1200,
        email: "maldony@kek.bot_codebattle",
        lang: "php",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -17,
        name: "Melodin",
        is_bot: true,
        rating: 1200,
        email: "melodin@dev.bot_codebattle",
        lang: "php",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -18,
        name: "DenisPython",
        is_bot: true,
        rating: 1300,
        email: "Denis@python.bot_codebattle",
        lang: "python",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -19,
        name: "NikitaOpenSource",
        is_bot: true,
        rating: 1300,
        email: "Nikita@os.bot_codebattle",
        lang: "python",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -20,
        name: "KalashnikovisMe",
        is_bot: true,
        rating: 1200,
        email: "KalashnikovsMe@ruby.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -21,
        name: "KolesnikovisMe",
        is_bot: true,
        rating: 1300,
        email: "KolesnikovisMe@ruby.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -22,
        name: "Plugin999",
        is_bot: true,
        rating: 1200,
        email: "Plugin@ruby.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -23,
        name: "Point213",
        is_bot: true,
        rating: 1200,
        email: "Point213@ruby.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -24,
        name: "Point214",
        is_bot: true,
        rating: 1300,
        email: "Point214@ruby.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -25,
        name: "Point215",
        is_bot: true,
        rating: 1200,
        email: "Point215@php.bot_codebattle",
        lang: "php",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -26,
        name: "Zamorozzzko",
        is_bot: true,
        rating: 1200,
        email: "Zamorozzzko@ruby.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      },
      %{
        id: -27,
        name: "HappyQleaner",
        is_bot: true,
        rating: 1200,
        email: "HappyQleaner@ruby.bot_codebattle",
        lang: "ruby",
        achievements: ["bot"],
        inserted_at: utc_now,
        updated_at: utc_now
      }
    ]

    Codebattle.Repo.insert_all(Codebattle.User, bots)
  end
end
