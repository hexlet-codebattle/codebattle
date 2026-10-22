defmodule CodebattleWeb.MetaTags do
  @moduledoc """
  The page's title / Open Graph / Twitter tags for the layouts: the controller's
  `put_meta_tags/2` values over the site defaults (`config :codebattle, :meta_tags`).

  Runtime defaults (`CODEBATTLE_OPENGRAPH_*`) are merged here.
  A page that sets no `url` gets its own
  address as `og:url` — scrapers treat it as canonical, so the site root there would
  collapse every shared page into the landing page.
  """

  # Adapted from phoenix_meta_tags (MIT, Copyright (c) 2018 hlongvu).
  # See docs/licenses/phoenix_meta_tags.LICENSE for the original license and source.
  import PhoenixHTMLHelpers.Tag, only: [content_tag: 2, tag: 2]

  @default_tags ~w(title description image url og:type og:url og:title og:description og:image
                   twitter:title twitter:card twitter:url twitter:description twitter:image)

  @social_tags [
    {"og:type", "og:type"},
    {"og:url", "url"},
    {"og:title", "title"},
    {"og:description", "description"},
    {"og:image", "image"},
    {"twitter:card", "twitter:card"},
    {"twitter:url", "url"},
    {"twitter:title", "title"},
    {"twitter:description", "description"},
    {"twitter:image", "image"}
  ]

  # static/images/opengraph-main.jpg, the stock card.
  @stock_image "/assets/images/opengraph-main.jpg"
  @stock_image_size %{"og:image:width" => 2400, "og:image:height" => 1260, "og:image:type" => "image/jpeg"}

  def put_meta_tags(conn, tags), do: Plug.Conn.assign(conn, :meta_tags, tags)

  def render_tags_all(page_tags) do
    defaults = defaults()
    tags = Map.merge(defaults, flat(page_tags))
    title = tags["title"] || defaults["title"]
    description = tags["description"] || defaults["description"]

    standard = [
      content_tag(:title, title),
      tag(:meta, content: title, name: "title"),
      tag(:meta, content: description, name: "description")
    ]

    social =
      Enum.map(@social_tags, fn {key, fallback} ->
        meta_tag(key, tags[key] || tags[fallback] || defaults[fallback])
      end)

    other =
      tags
      |> Map.drop(@default_tags)
      |> Enum.map(fn {key, value} -> meta_tag(key, value) end)

    standard ++ social ++ other
  end

  defp meta_tag("twitter:" <> _ = key, value), do: tag(:meta, content: value, name: key)
  defp meta_tag(key, value), do: tag(:meta, content: value, property: key)

  defp defaults, do: flat(Application.fetch_env!(:codebattle, :meta_tags))

  def build(conn, page_tags) do
    page = flat(page_tags)
    tags = Map.merge(defaults(), page)

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
  defp flat(tags), do: flat(tags, "")

  defp flat(tags, prefix) do
    Enum.reduce(tags, %{}, fn {key, value}, acc ->
      key = prefix <> to_string(key)

      if is_map(value) do
        Map.merge(acc, flat(value, key <> ":"))
      else
        Map.put(acc, key, value)
      end
    end)
  end
end
