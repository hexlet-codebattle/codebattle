defmodule CodebattleWeb.Plugs.AssignGonTest do
  use CodebattleWeb.ConnCase, async: true

  import PhoenixGon.Controller

  alias CodebattleWeb.Plugs.AssignGon

  test "includes avatar_url in current_user gon payload", %{conn: conn} do
    user = insert(:user, avatar_url: "https://example.com/avatar.png")

    conn =
      conn
      |> PhoenixGon.Pipeline.call(PhoenixGon.Pipeline.init([]))
      |> put_private(:phoenix_endpoint, CodebattleWeb.Endpoint)
      |> assign(:current_user, user)
      |> AssignGon.call([])

    assert %{avatar_url: "https://example.com/avatar.png"} = get_gon(conn, :current_user)
  end

  test "includes has_password in current_user gon payload", %{conn: conn} do
    user = insert(:user, github_id: 1, password_hash: "password-hash")

    conn =
      conn
      |> PhoenixGon.Pipeline.call(PhoenixGon.Pipeline.init([]))
      |> put_private(:phoenix_endpoint, CodebattleWeb.Endpoint)
      |> assign(:current_user, user)
      |> AssignGon.call([])

    assert %{has_password: true} = get_gon(conn, :current_user)
  end
end
