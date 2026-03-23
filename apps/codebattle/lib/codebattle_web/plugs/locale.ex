defmodule CodebattleWeb.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import PhoenixGon.Controller
  import Plug.Conn

  @valid_locales ~w(en ru)

  def init(_opts), do: nil

  def call(conn, _opts) do
    locale = get_forced_locale() || get_user_locale(conn) || get_default_locale()

    Gettext.put_locale(CodebattleWeb.Gettext, locale)

    conn
    |> put_gon(locale: locale)
    |> put_session(:locale, locale)
  end

  defp get_forced_locale do
    case Application.get_env(:codebattle, :force_locale) do
      locale when locale in @valid_locales -> locale
      _ -> nil
    end
  end

  defp get_user_locale(conn) do
    case conn.assigns[:current_user] do
      %{locale: locale} when locale in @valid_locales -> locale
      _ -> nil
    end
  end

  defp get_default_locale do
    Application.get_env(:codebattle, :default_locale, "en")
  end
end
