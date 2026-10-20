defmodule CodebattleWeb.GettextTest do
  use ExUnit.Case, async: true

  alias CodebattleWeb.Gettext, as: Backend

  test "Spanish and Chinese catalogs render interface text and preserve interpolation" do
    assert ~w(es zh) -- Gettext.known_locales(Backend) == []

    for {locale, play, welcome} <- [
          {"es", "Juega tu primer duelo", "¡Bienvenido a Codebattle!"},
          {"zh", "开始你的第一场对战", "欢迎来到 Codebattle！"}
        ] do
      Gettext.with_locale(Backend, locale, fn ->
        assert Gettext.dgettext(Backend, "default", "Play your first battle") == play
        assert Gettext.dgettext(Backend, "default", "Welcome to %{name}!", name: "Codebattle") == welcome
      end)
    end
  end

  test "uses Spanish singular and plural forms and one Chinese form" do
    for {locale, count, expected} <- [
          {"es", 0, "Quedan 0 problemas"},
          {"es", 1, "Queda 1 problema"},
          {"es", 2, "Quedan 2 problemas"},
          {"zh", 0, "剩余 0 道题目"},
          {"zh", 1, "剩余 1 道题目"},
          {"zh", 2, "剩余 2 道题目"}
        ] do
      Gettext.with_locale(Backend, locale, fn ->
        assert Gettext.dngettext(Backend, "default", "arena_task_stats", "%{count} tasks left", count) == expected
      end)
    end
  end
end
