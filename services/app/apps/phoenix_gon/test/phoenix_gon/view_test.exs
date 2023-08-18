defmodule PhoenixGon.ViewTest do
  use ExUnit.Case, async: false
  use RouterHelper

  import PhoenixGon.Controller

  alias Plug.Conn

  describe "#render_gon_script" do
    test 'text' do
      conn =
        %Conn{}
        |> with_gon

      actual = PhoenixGon.View.render_gon_script(conn)

      assert {:safe, _} = actual
    end
  end

  describe "#escape_assets" do
    test "escapes javascript" do
      conn =
        %Conn{}
        |> with_gon

      conn =
        put_gon(
          conn,
          :malicious,
          "all your base</script><script>alert('are belong to us!')</script>"
        )

      actual = PhoenixGon.View.escape_assets(conn)

      expected =
        "{\\\"malicious\\\":\\\"all your base<\\/script><script>alert(\\'are belong to us!\\')<\\/script>\\\"}"

      assert expected == actual
    end

    test "converts assets names and nested maps keys to camel case if corresponding option is enabled" do
      conn =
        %Conn{}
        |> with_gon(camel_case: true)

      actual_assets =
        conn
        |> put_gon(:foo_bar, "Foo Bar")
        |> put_gon(:test_map, %{map_key: "Foo Bar"})
        |> PhoenixGon.View.escape_assets()

      expected_assets =
        "{\\\"fooBar\\\":\\\"Foo Bar\\\",\\\"testMap\\\":{\\\"mapKey\\\":\\\"Foo Bar\\\"}}"

      assert actual_assets == expected_assets
    end

    test "doesn't convert assets names and nested maps keys to camel case if corresponding option is disabled" do
      conn =
        %Conn{}
        |> with_gon

      actual_assets =
        conn
        |> put_gon(:test_map, %{map_key: "Foo Bar"})
        |> PhoenixGon.View.escape_assets()

      expected_assets = "{\\\"test_map\\\":{\\\"map_key\\\":\\\"Foo Bar\\\"}}"

      assert actual_assets == expected_assets
    end
  end
end
