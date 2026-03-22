defmodule Codebattle.LayoutViewTest do
  use CodebattleWeb.ConnCase, async: true

  alias CodebattleWeb.LayoutView

  test "avatar_url returns persisted avatar when present" do
    user = %{avatar_url: "https://example.com/avatar.png", name: "vtm"}

    assert LayoutView.avatar_url(user) == "https://example.com/avatar.png"
  end

  test "avatar_url builds a local svg placeholder when avatar is missing" do
    avatar_url = LayoutView.avatar_url(%{avatar_url: nil, name: "vtm"})

    assert avatar_url =~ "data:image/svg+xml,"
    refute avatar_url =~ "ui-avatars.com"

    decoded_svg =
      avatar_url
      |> String.replace_prefix("data:image/svg+xml,", "")
      |> URI.decode()

    assert decoded_svg =~ "fill='#FF621E'"
    assert decoded_svg =~ ">VT<"
  end
end
