defmodule CodebattleWeb.HtmlImageTest do
  use ExUnit.Case, async: true

  alias CodebattleWeb.HtmlImage

  test "returns empty binary when renderer exits" do
    html = "<html></html>"

    original_value = Application.get_env(:codebattle, :fake_html_to_image)
    Application.put_env(:codebattle, :fake_html_to_image, false)

    on_exit(fn ->
      Application.put_env(:codebattle, :fake_html_to_image, original_value)
    end)

    image =
      HtmlImage.generate_png(html, fn _ ->
        exit({:shutdown, {NimblePool, :checkout, [self()]}})
      end)

    assert image == ""
  end
end
