defmodule PhoenixGon.ViewTest do
  use ExUnit.Case, async: false
  use RouterHelper

  import PhoenixGon.Controller

  alias Plug.Conn

  describe "#render_gon_script" do
    test "text" do
      conn = with_gon(%Conn{})

      actual = PhoenixGon.View.render_gon_script(conn)

      assert {:safe, _} = actual
    end
  end

  describe "#escape_assets" do
    test "escapes javascript" do
      conn = with_gon(%Conn{})

      conn = put_gon(conn, malicious: "all your base</script><script>alert('are belong to us!')</script>")

      actual = PhoenixGon.View.escape_assets(conn)

      expected =
        ~s|{\\"malicious\\":\\"all your base<\\/script><script>alert(\\'are belong to us!\\')<\\/script>\\"}|

      assert expected == actual
    end

    test "converts assets names and nested maps keys to camel case if corresponding option is enabled" do
      conn = with_gon(%Conn{}, camel_case: true)

      actual_assets =
        conn
        |> put_gon(foo_bar: "Foo Bar")
        |> put_gon(test_map: %{map_key: "Foo Bar"})
        |> PhoenixGon.View.escape_assets()

      expected_assets =
        ~s({\\"fooBar\\":\\"Foo Bar\\",\\"testMap\\":{\\"mapKey\\":\\"Foo Bar\\"}})

      assert actual_assets == expected_assets
    end

    test "doesn't convert assets names and nested maps keys to camel case if corresponding option is disabled" do
      conn = with_gon(%Conn{})

      actual_assets =
        conn
        |> put_gon(test_map: %{map_key: "Foo Bar"})
        |> PhoenixGon.View.escape_assets()

      expected_assets = ~s({\\"test_map\\":{\\"map_key\\":\\"Foo Bar\\"}})

      assert actual_assets == expected_assets
    end
  end
end
