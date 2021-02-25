defmodule CodebattleWeb.PageView do
  use CodebattleWeb, :view

  alias Codebattle.FeedBack
  import CodebattleWeb.Router.Helpers

  def csrf_token() do
    Plug.CSRFProtection.get_csrf_token()
  end

  def user_name(%Codebattle.User{name: name, rating: rating}) do
    case {name, rating} do
      {nil, nil} -> ""
      _ -> "#{name}(#{rating})"
    end
  end

  def feedback() do
    FeedBack.get_all() |> Enum.map(&item/1)
  end

  defp item(%{
         title: title,
         description: description,
         pubDate: pub_date,
         link: link,
         guid: guid
       }) do
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

  def get_next_path(conn) do
    next = conn.params["next"]

    case next do
      "" -> conn.request_path
      nil -> conn.request_path
      _ -> next
    end
  end
end
