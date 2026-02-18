defmodule CodebattleWeb.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import PhoenixGon.Controller
  import Plug.Conn

  def init(_opts), do: nil

  def call(conn, _opts) do
    locale = conn.assigns.current_user.locale

    Gettext.put_locale(CodebattleWeb.Gettext, locale)

    conn
    |> put_gon(locale: locale)
    |> put_session(:locale, locale)
  end
end
