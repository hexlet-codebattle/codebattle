defmodule CodebattleWeb.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import PhoenixGon.Controller
  import Plug.Conn

  @valid_locales ~w(en ru)

  def init(_opts), do: nil

  def call(conn, _opts) do
    default_locale = Application.get_env(:codebattle, :default_locale, "en")

    locale =
      case conn.assigns[:current_user] do
        %{locale: locale} when locale in @valid_locales -> locale
        _ -> default_locale
      end

    Gettext.put_locale(CodebattleWeb.Gettext, locale)

    conn
    |> put_gon(locale: locale)
    |> put_session(:locale, locale)
  end
end
