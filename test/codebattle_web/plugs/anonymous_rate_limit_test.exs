defmodule CodebattleWeb.Plugs.AnonymousRateLimitTest do
  use CodebattleWeb.ConnCase, async: false

  alias CodebattleWeb.ClientIP
  alias CodebattleWeb.Plugs.AnonymousRateLimit

  @cache :anonymous_rate_limit_cache
  @ip {203, 0, 113, 10}
  @window to_timeout(hour: 1)

  setup do
    keys = [:anonymous_rate_limit_enabled, :anonymous_rate_limit, :anonymous_rate_limit_trusted_proxies]
    original = Map.new(keys, &{&1, Application.fetch_env!(:codebattle, &1)})

    Application.put_env(:codebattle, :anonymous_rate_limit_enabled, true)
    limits(burst: 30, reads: 180, expensive: 20)
    Cachex.clear(@cache)

    on_exit(fn ->
      Enum.each(original, fn {key, value} -> Application.put_env(:codebattle, key, value) end)
      Cachex.clear(@cache)
    end)

    :ok
  end

  test "shares the burst budget across game IDs, tournaments and guest identities" do
    limits(burst: 3)

    refute request("/games/1").halted
    refute request("/tournaments/2", guest: User.build_guest(-1_000_001)).halted
    refute request("/api/v1/tournaments/3").halted

    conn = request("/games/4", guest: User.build_guest(-1_000_002))
    assert conn.status == 429
    assert conn.halted
    assert html_response(conn, 429) =~ "Please try again"
    assert [retry_after] = get_resp_header(conn, "retry-after")
    assert String.to_integer(retry_after) in 1..3600
    assert get_resp_header(conn, "cache-control") == ["no-store"]
  end

  test "enforces a sustained budget independently of the burst budget" do
    limits(burst: 100, reads: 2)

    refute request().halted
    refute request().halted
    assert request().status == 429
  end

  test "applies one tighter budget to images, replay downloads and reports" do
    limits(expensive: 3)

    refute request("/games/1/image").halted
    refute request("/tournaments/2/image").halted
    refute request("/games/3/ml").halted

    conn = request("/api/v1/playbook/4", format: "json")
    assert json_response(conn, 429) == %{"errors" => %{"base" => "Too many requests. Please try again later."}}
    assert conn.halted

    refute request("/games/5").halted
    refute request("/api/v1/tournaments/6").halted
  end

  test "isolates client addresses" do
    limits(burst: 1)

    refute request().halted
    assert request().halted
    refute request("/games/1", ip: {203, 0, 113, 11}).halted
  end

  test "groups IPv6 privacy addresses by /64 but keeps other subnets independent" do
    limits(burst: 1)

    refute request("/games/1", ip: {0x2001, 0xDB8, 1, 2, 0, 0, 0, 1}).halted
    assert request("/games/2", ip: {0x2001, 0xDB8, 1, 2, 0, 0, 0, 2}).halted
    refute request("/games/3", ip: {0x2001, 0xDB8, 1, 3, 0, 0, 0, 1}).halted
  end

  test "signed-in users bypass the anonymous budgets without consuming them" do
    limits(burst: 1)

    for _ <- 1..3, do: refute(request("/games/1", guest: build(:user)).halted)
    refute request().halted
    assert request().halted
    refute request("/games/1", guest: build(:user)).halted
  end

  test "writes and unrelated paths retain their own limits" do
    limits(burst: 1)

    refute request().halted
    assert request().halted

    for method <- ["POST", "PATCH", "DELETE"] do
      refute request("/games/training", method: method).halted
    end

    for path <- ["/health", "/assets/app.js", "/settings", "/", "/public_api/v1/games/live"] do
      refute request(path).halted
    end
  end

  test "HEAD reads consume the same budget" do
    limits(burst: 1)

    refute request("/games/1", method: "HEAD").halted
    assert request("/tournaments/2", method: "HEAD").status == 429
  end

  test "can be disabled independently of auth limiting" do
    limits(burst: 1)
    Application.put_env(:codebattle, :anonymous_rate_limit_enabled, false)

    for _ <- 1..3, do: refute(request().halted)
    assert {:ok, 0} = Cachex.size(@cache)
  end

  test "uses a fresh time slice even before the cache sweeps old counters" do
    limits(burst: 1)
    previous_slice = Integer.floor_div(System.monotonic_time(:millisecond), @window) - 1
    Cachex.put(@cache, {:burst, @ip, @window, previous_slice}, 1000)

    refute request().halted
    assert request().halted
  end

  test "counters expire and blocked requests do not create per-resource keys" do
    limits(burst: 1)

    for id <- 1..10, do: request("/games/#{id}")

    assert {:ok, keys} = Cachex.keys(@cache)
    assert length(keys) == 2

    for key <- keys do
      assert {:ok, ttl} = Cachex.ttl(@cache, key)
      assert ttl > 0
      assert ttl <= @window * 2
    end
  end

  test "counts concurrent requests atomically" do
    limits(burst: 5)

    allowed =
      1..30
      |> Task.async_stream(fn _ -> request().halted end, max_concurrency: 10)
      |> Enum.count(&(&1 == {:ok, false}))

    assert allowed == 5
  end

  test "cache errors fail open" do
    limits(burst: 1)
    slice = Integer.floor_div(System.monotonic_time(:millisecond), @window)
    Cachex.put(@cache, {:burst, @ip, @window, slice}, "invalid counter")

    refute request().halted
    refute request().halted
  end

  test "the router protects HTML and JSON endpoints before loading resources", %{conn: conn} do
    limits(burst: 1)
    refute request().halted

    for path <- [
          "/games/123456789",
          "/games/123456789/stream",
          "/games/123456789/ml",
          "/games/123456789/image",
          "/tournaments/123456789",
          "/tournaments/123456789/image",
          "/tournaments/123456789/player/123456789",
          "/schedule"
        ] do
      response = conn |> Map.put(:remote_ip, @ip) |> get(path)
      assert html_response(response, 429) =~ "Too many requests"
    end

    for path <- [
          "/api/v1/playbook/123456789",
          "/api/v1/games/completed",
          "/api/v1/tournaments",
          "/api/v1/tournaments/history",
          "/api/v1/tournaments/123456789"
        ] do
      response = conn |> Map.put(:remote_ip, @ip) |> put_req_header("accept", "application/json") |> get(path)
      assert %{"errors" => %{"base" => "Too many requests" <> _}} = json_response(response, 429)
    end
  end

  test "the router exempts authenticated sessions", %{conn: conn} do
    limits(burst: 1)
    refute request().halted
    assert request().halted

    conn = conn |> Map.put(:remote_ip, @ip) |> log_in_user(insert(:user)) |> get("/games/123456789")
    assert html_response(conn, 404) =~ "Game not found"
  end

  test "ignores spoofed forwarding headers from a direct internet client" do
    limits(burst: 1)

    refute request("/games/1", forwarded: "198.51.100.1").halted
    assert request("/games/2", forwarded: "198.51.100.2").halted
  end

  test "walks trusted proxy hops from the right, ignoring client-supplied prefixes" do
    conn = %{build_conn() | remote_ip: {10, 0, 0, 1}}

    assert conn |> put_req_header("x-forwarded-for", "1.2.3.4, 203.0.113.10, 192.168.1.2") |> ClientIP.from_conn() ==
             @ip

    assert conn |> put_req_header("x-forwarded-for", "5.6.7.8, 203.0.113.10, 192.168.1.2") |> ClientIP.from_conn() ==
             @ip

    limits(burst: 1)
    refute request("/games/1", ip: conn.remote_ip, forwarded: "1.2.3.4, 203.0.113.10").halted
    assert request("/games/2", ip: conn.remote_ip, forwarded: "5.6.7.8, 203.0.113.10").halted
    refute request("/games/3", ip: conn.remote_ip, forwarded: "203.0.113.11").halted
  end

  test "normalizes IPv4-mapped IPv6 and handles invalid forwarding values" do
    conn = %{build_conn() | remote_ip: {10, 0, 0, 1}}
    assert conn |> put_req_header("x-forwarded-for", "::ffff:203.0.113.10") |> ClientIP.from_conn() == @ip
    assert conn |> put_req_header("x-forwarded-for", "garbage") |> ClientIP.from_conn() == conn.remote_ip
    assert ClientIP.from_conn(conn) == conn.remote_ip

    Application.put_env(:codebattle, :anonymous_rate_limit_trusted_proxies, [])
    assert conn |> put_req_header("x-forwarded-for", "203.0.113.10") |> ClientIP.from_conn() == conn.remote_ip
  end

  defp request(path \\ "/games/1", opts \\ []) do
    conn =
      opts
      |> Keyword.get(:method, "GET")
      |> build_conn(path)
      |> Map.put(:remote_ip, Keyword.get(opts, :ip, @ip))
      |> assign(:current_user, Keyword.get(opts, :guest, User.build_guest()))
      |> Phoenix.Controller.put_format(Keyword.get(opts, :format, "html"))

    conn = if opts[:forwarded], do: put_req_header(conn, "x-forwarded-for", opts[:forwarded]), else: conn
    AnonymousRateLimit.call(conn, AnonymousRateLimit.init([]))
  end

  defp limits(overrides) do
    limits = Keyword.merge([burst: 30, reads: 180, expensive: 20], overrides)

    Application.put_env(
      :codebattle,
      :anonymous_rate_limit,
      Enum.map(limits, fn {key, limit} -> {key, {limit, @window}} end)
    )
  end
end
