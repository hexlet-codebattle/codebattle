defmodule CodebattleWeb.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import Plug.Conn
  import PhoenixGon.Controller

  def init(_opts), do: nil

  def call(conn, _opts) do
    case conn.params["locale"] || get_session(conn, :locale) do
      nil ->
        put_gon(conn, locale: :en)

      locale ->
        Gettext.put_locale(CodebattleWeb.Gettext, locale)
        conn |> put_gon(locale: :en) |> put_session(:locale, locale)
    end
  end
end
