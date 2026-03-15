defmodule CodebattleWeb.HtmlImage do
  @moduledoc false
  import Plug.Conn

  require Logger

  @doc """
  Renders an image from the given HTML content. It first checks the cache (using the provided cache_key);
  if not found, it generates a PNG from the HTML, caches it, and sends it in the response.
  """
  def render_image(conn, cache_key, html_content) do
    image =
      case Codebattle.ImageCache.get_image(cache_key) do
        nil ->
          new_image = generate_png(html_content)
          cache_image(cache_key, new_image)
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
  def generate_png(html_content, renderer \\ &capture_png/1) do
    if fake_html_to_image?() do
      html_content
    else
      safe_generate_png(html_content, renderer)
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

  defp fake_html_to_image? do
    Application.get_env(:codebattle, :fake_html_to_image, false)
  end

  defp safe_generate_png(html_content, renderer) do
    renderer.(html_content)
  rescue
    error ->
      Logger.warning("Image generation failed: #{Exception.message(error)}")
      ""
  catch
    kind, reason ->
      Logger.warning("Image generation failed: #{Exception.format_banner(kind, reason)}")
      ""
  end

  defp capture_png(html_content) do
    {:html, html_content}
    |> ChromicPDF.capture_screenshot(capture_screenshot: %{format: "png"})
    |> then(fn {:ok, image} -> Base.decode64!(image) end)
  end

  defp cache_image(_cache_key, ""), do: :ok
  defp cache_image(cache_key, image), do: Codebattle.ImageCache.put_image(cache_key, image)
end
