defmodule CodebattleWeb.MetaTags do
  @moduledoc """
  The page's title / Open Graph / Twitter tags for the layouts: the controller's
  `put_meta_tags/2` values over the site defaults (`config :phoenix_meta_tags`).

  PhoenixMetaTags bakes its defaults in at compile time, so the runtime ones
  (`CODEBATTLE_OPENGRAPH_*`) are merged here. A page that sets no `url` gets its own
  address as `og:url` — scrapers treat it as canonical, so the site root there would
  collapse every shared page into the landing page.
  """

  alias PhoenixMetaTags.MapHelper

  # static/images/opengraph-main.jpg, the stock card.
  @stock_image "/assets/images/opengraph-main.jpg"
  @stock_image_size %{"og:image:width" => 2400, "og:image:height" => 1260, "og:image:type" => "image/jpeg"}

  def build(conn, page_tags) do
    page = flat(page_tags)
    tags = Map.merge(flat(Application.get_all_env(:phoenix_meta_tags)), page)

    tags
    |> put_page_url(page, conn)
    |> put_stock_image_size()
    |> Map.put_new("og:image:alt", tags["title"])
    |> Map.put_new("twitter:image:alt", tags["title"])
    |> Map.put_new("og:locale", og_locale(Gettext.get_locale(CodebattleWeb.Gettext)))
  end

  defp put_page_url(tags, page, conn) do
    if Map.has_key?(page, "url") or Map.has_key?(page, "og:url") do
      tags
    else
      Map.put(tags, "url", CodebattleWeb.Endpoint.url() <> conn.request_path)
    end
  end

  defp put_stock_image_size(tags) do
    image = tags["og:image"] || tags["image"]

    if is_binary(image) and String.ends_with?(image, @stock_image) do
      Map.merge(@stock_image_size, tags)
    else
      tags
    end
  end

  defp og_locale("ru"), do: "ru_RU"
  defp og_locale("en"), do: "en_US"
  defp og_locale(locale), do: locale

  defp flat(nil), do: %{}
  defp flat(tags), do: tags |> Map.new() |> MapHelper.flatMap()
end
