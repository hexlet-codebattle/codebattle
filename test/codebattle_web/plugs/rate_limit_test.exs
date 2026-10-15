defmodule CodebattleWeb.Plugs.RateLimitTest do
  use CodebattleWeb.ConnCase, async: false

  alias CodebattleWeb.Plugs.RateLimit

  setup do
    # Rate limiting is disabled in the test env by default; enable it just for
    # these cases and start from a clean counter.
    Application.put_env(:codebattle, :auth_rate_limit_enabled, true)
    Cachex.clear(:auth_rate_limit_cache)

    on_exit(fn -> Application.put_env(:codebattle, :auth_rate_limit_enabled, false) end)

    :ok
  end

  defp request(bucket, limit, ip \\ "1.2.3.4") do
    opts = RateLimit.init(bucket: bucket, limit: limit, window: to_timeout(minute: 1))

    build_conn()
    |> Map.put(:remote_ip, {1, 2, 3, 4})
    |> put_req_header("x-forwarded-for", ip)
    |> RateLimit.call(opts)
  end

  test "allows requests up to the limit and blocks the next one" do
    for _ <- 1..3, do: refute(request("sign_in", 3).halted)

    conn = request("sign_in", 3)

    assert conn.halted
    assert conn.status == 429
    assert conn.resp_body =~ "Too many attempts"
  end

  test "counts each client IP independently" do
    for _ <- 1..3, do: request("sign_in", 3, "9.9.9.9")

    refute request("sign_in", 3, "8.8.8.8").halted
  end

  test "buckets are isolated from each other" do
    for _ <- 1..3, do: request("sign_in", 3)

    refute request("sign_up", 3).halted
  end

  test "does nothing when disabled" do
    Application.put_env(:codebattle, :auth_rate_limit_enabled, false)

    for _ <- 1..10, do: refute(request("sign_in", 3).halted)
  end
end
