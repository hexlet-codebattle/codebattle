defmodule CodebattleWeb.EmailChangeRateLimitTest do
  use CodebattleWeb.ConnCase, async: false

  alias CodebattleWeb.EmailChangeRateLimit

  setup do
    Cachex.clear(:email_change_rate_limit_cache)
    :ok
  end

  test "limits every valid initiation by account", %{conn: conn} do
    assert :ok = EmailChangeRateLimit.consume(conn, 101)
    assert :ok = EmailChangeRateLimit.consume(conn, 101)
    assert :ok = EmailChangeRateLimit.consume(conn, 101)
    assert {:error, :rate_limited} = EmailChangeRateLimit.consume(conn, 101)
  end

  test "limits initiations from the same forwarded client IP", %{conn: conn} do
    conn = Plug.Conn.put_req_header(conn, "x-forwarded-for", "203.0.113.10, 10.0.0.2")

    Enum.each(1..10, fn user_id ->
      assert :ok = EmailChangeRateLimit.consume(conn, user_id)
    end)

    assert {:error, :rate_limited} = EmailChangeRateLimit.consume(conn, 11)
  end
end
