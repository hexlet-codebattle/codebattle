defmodule CodebattleWeb.HtmlImage do
  @moduledoc false
  import Plug.Conn

  @fake_html_to_image Application.compile_env(:codebattle, :fake_html_to_image, false)

  @doc """
  Renders an image from the given HTML content. It first checks the cache (using the provided cache_key);
  if not found, it generates a PNG from the HTML, caches it, and sends it in the response.
  """
  def render_image(conn, cache_key, html_content) do
    image =
      case Codebattle.ImageCache.get_image(cache_key) do
        nil ->
          new_image = generate_png(html_content)
          Codebattle.ImageCache.put_image(cache_key, new_image)
          new_image

        image ->
          image
      end

    conn
    |> put_resp_content_type("image/png")
    |> send_resp(200, image)
  end

  @doc """
  Generates a PNG image from the given HTML content.
  If the fake HTML-to-image mode is enabled, it returns the HTML content instead.
  """
  def generate_png(html_content) do
    if @fake_html_to_image do
      html_content
    else
      {:html, html_content}
      |> ChromicPDF.capture_screenshot(capture_screenshot: %{format: "png"})
      |> then(fn {:ok, image} -> Base.decode64!(image) end)
    end
  end

  @doc """
  Returns the logo URL based on configuration.
  """
  def logo_url do
    if logo = Application.get_env(:codebattle, :collab_logo) do
      logo
    else
      endpoint_config = Application.get_env(:codebattle, CodebattleWeb.Endpoint, [])
      url_config = Keyword.get(endpoint_config, :url, [])
      scheme = Keyword.get(url_config, :scheme, "https")
      host = Keyword.get(url_config, :host, "codebattle.hexlet.io")
      logo_path = CodebattleWeb.Vite.static_asset_path("images/logo.svg")
      "#{scheme}://#{host}#{logo_path}"
    end
  end
end
