defmodule CodebattleWeb.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import Plug.Conn
  import PhoenixGon.Controller

  def init(_opts), do: nil

  def call(conn, _opts) do
    locale =
      if Application.get_env(:codebattle, :force_locale) do
        Application.get_env(:codebattle, :default_locale)
      else
        conn.params["locale"] || get_session(conn, :locale) ||
          Application.get_env(:codebattle, :default_locale)
      end

    conn
    |> put_locale(locale)
  end

  defp put_locale(conn, locale) do
    Gettext.put_locale(CodebattleWeb.Gettext, locale)

    conn
    |> put_gon(locale: locale)
    |> put_session(:locale, locale)
  end
end
