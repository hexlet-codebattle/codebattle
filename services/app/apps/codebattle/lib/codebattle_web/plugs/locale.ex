defmodule CodebattleWeb.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import Plug.Conn
  import PhoenixGon.Controller

  def init(_opts), do: nil

  def call(conn, _opts) do
    if Application.get_env(:codebattle, :force_locale) do
      locale = Application.get_env(:codebattle, :default_locale)
      Gettext.put_locale(CodebattleWeb.Gettext, locale)

      conn
      |> put_gon(locale: locale)
      |> put_session(:locale, locale)
    else
      locale =
        conn.params["locale"] || get_session(conn, :locale) ||
          Application.get_env(:codebattle, :default_locale)

      Gettext.put_locale(CodebattleWeb.Gettext, locale)

      conn
      |> put_session(:locale, locale)
    end
  end
end
