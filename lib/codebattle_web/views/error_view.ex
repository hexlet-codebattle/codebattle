defmodule CodebattleWeb.ErrorView do
  use CodebattleWeb, :view
  import CodebattleWeb.Gettext

  def render("404.html", assigns) do
    render(
      "404_page.html",
      Map.merge(assigns, %{msg: assigns[:msg] || gettext("Page not found")})
    )
  end

  def render("500.html", _assigns) do
    gettext("Internal server error")
  end

  # In case no render clause matches or no
  # template is found, let's render it as 500
  def template_not_found(_template, assigns) do
    render("500.html", assigns)
  end
end
