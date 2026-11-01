defmodule Codebattle.Tournament.LocalizationTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Localization

  test "selects the requested language, then English, then the original text" do
    tournament = %Tournament{
      name: "Original name",
      description: "Original description",
      name_translations: %{"en" => "English name", "ru" => "Русское название"},
      description_translations: %{"zh" => "中文介绍", "es" => " "}
    }

    assert Localization.name(tournament, "ru") == "Русское название"
    assert Localization.name(tournament, "zh") == "English name"
    assert Localization.description(tournament, "zh") == "中文介绍"
    assert Localization.description(tournament, "es") == "Original description"
    assert Localization.name(%{tournament | name_translations: %{}}, "ru") == "Original name"
  end

  test "trims translations and drops empty optional translations" do
    changeset =
      Tournament.changeset(build(:tournament), %{
        name_translations: %{en: " Code party ", ru: " ", es: nil},
        description_translations: %{"zh" => " 欢迎参赛！ ", "en" => ""}
      })

    assert changeset.valid?
    assert Ecto.Changeset.get_change(changeset, :name_translations) == %{"en" => "Code party"}
    assert Ecto.Changeset.get_change(changeset, :description_translations) == %{"zh" => "欢迎参赛！"}
  end

  test "rejects unsupported locales, non-text values and oversized translations" do
    for {field, translations} <- [
          {:name_translations, %{"fr" => "Bonjour"}},
          {:name_translations, %{"ru" => %{"nested" => "text"}}},
          {:name_translations, %{"en" => String.duplicate("a", 81)}},
          {:description_translations, %{"en" => "ab"}},
          {:description_translations, %{"zh" => String.duplicate("字", 7532)}}
        ] do
      changeset = Tournament.changeset(build(:tournament), %{field => translations})
      refute changeset.valid?
      assert Keyword.has_key?(changeset.errors, field)
    end
  end

  test "clearing translations leaves a non-null map and preserves the legacy text" do
    tournament = build(:tournament, name_translations: %{"ru" => "Название"})
    changeset = Tournament.changeset(tournament, %{name_translations: nil})
    assert changeset.valid?
    assert Ecto.Changeset.get_field(changeset, :name_translations) == %{}
    assert Ecto.Changeset.get_field(changeset, :name) == tournament.name
  end
end
