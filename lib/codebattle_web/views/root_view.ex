defmodule CodebattleWeb.RootView do
  use CodebattleWeb, :view

  alias Codebattle.Feedback

  def csrf_token do
    Plug.CSRFProtection.get_csrf_token()
  end

  def feedback do
    Enum.map(Feedback.get_all(), &item/1)
  end

  defp item(%{title: title, description: description, pubDate: pub_date, link: link, guid: guid}) do
    """
    <item>
      <title>#{title}</title>
      <description><![CDATA[#{description}]]></description>
      <pubDate>#{pub_date}</pubDate>
      <link>#{link}</link>
      <guid>#{guid}</guid>
    </item>
    """
  end
end
