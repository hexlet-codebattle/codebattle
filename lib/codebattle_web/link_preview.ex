defmodule CodebattleWeb.LinkPreview do
  @moduledoc """
  Link-preview scrapers (Telegram, Slack, X, …) arrive as guests, so pages behind
  `RequireAuth` would bounce them to the login page and every shared link would
  preview as the landing card. For those pages a controller can answer a scraper
  with just the head: the page's meta tags over an empty body.
  """

  import Plug.Conn

  @scrapers ~r/bot\b|crawler|spider|preview|facebookexternalhit|whatsapp|vkshare|iframely|embedly|mastodon/i

  def scraper?(conn) do
    case get_req_header(conn, "user-agent") do
      [agent | _] -> Regex.match?(@scrapers, agent)
      [] -> false
    end
  end

  @doc "Sends the meta-tags-only page; put the page's tags with `put_meta_tags/2` first."
  def send_head(conn) do
    tags =
      conn
      |> CodebattleWeb.MetaTags.build(conn.assigns[:meta_tags])
      |> CodebattleWeb.LayoutView.render_tags_all()
      |> Phoenix.HTML.Safe.to_iodata()

    locale = Gettext.get_locale(CodebattleWeb.Gettext)

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, [
      ~s(<!doctype html><html lang="#{locale}"><head><meta charset="utf-8">),
      tags,
      "</head><body></body></html>"
    ])
    |> halt()
  end
end
