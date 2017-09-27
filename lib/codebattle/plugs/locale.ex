defmodule Codebattle.Plugs.Locale do
  @moduledoc """
    I18n configuration
  """
  import Plug.Conn
  import PhoenixGon.Controller

  def init(_opts), do: nil

  def call(conn, _opts) do
    case conn.params["locale"] || get_session(conn, :locale) do
      nil     -> conn = put_gon(conn, locale: :en)
      locale  ->
        conn = put_gon(conn, locale: locale)
        Gettext.put_locale(CodebattleWeb.Gettext, locale)
        conn |> put_session(:locale, locale)
    end
  end
end
