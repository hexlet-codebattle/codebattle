defmodule CodebattleWeb.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import PhoenixGon.Controller
  import Plug.Conn

  def init(_opts), do: nil

  def call(conn, _opts) do
    locale =
      if FunWithFlags.enabled?(:enforce_default_locale) do
        Application.get_env(:codebattle, :default_locale)
      else
        conn.params["locale"] || get_session(conn, :locale) ||
          Application.get_env(:codebattle, :default_locale)
      end

    put_locale(conn, locale)
  end

  defp put_locale(conn, locale) do
    Gettext.put_locale(CodebattleWeb.Gettext, locale)

    conn
    |> put_gon(locale: locale)
    |> put_session(:locale, locale)
  end
end
