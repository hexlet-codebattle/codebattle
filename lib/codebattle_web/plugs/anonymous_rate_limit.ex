defmodule CodebattleWeb.Plugs.AnonymousRateLimit do
  @moduledoc """
  Per-IP limits for anonymous game/tournament HTTP reads, including their JSON
  endpoints. Signed-in users and writes retain their existing limits.

  Burst and sustained budgets are shared across routes, IDs and guest cookies.
  Images, replay downloads and bot-detection reports also share a tighter budget.
  Counters are atomic, local to each application node, and fail open on cache errors.
  Time-sliced keys reset independently of Cachex's expiration sweep.
  """
  import Plug.Conn

  alias CodebattleWeb.ClientIP

  @cache :anonymous_rate_limit_cache
  @message "Too many requests. Please try again later."

  def init(opts), do: opts

  def call(%{method: method, assigns: %{current_user: %{is_guest: true}}} = conn, _opts) when method in ["GET", "HEAD"] do
    if Application.get_env(:codebattle, :anonymous_rate_limit_enabled, true) and protected?(conn.path_info) do
      throttle(conn)
    else
      conn
    end
  end

  def call(conn, _opts), do: conn

  defp protected?([resource | _]) when resource in ["games", "tournaments", "schedule"], do: true

  defp protected?(["api", "v1", resource | _]) when resource in ["games", "tournaments", "playbook"], do: true

  defp protected?(_path), do: false

  defp expensive?(["games", _id, action]) when action in ["image", "ml"], do: true
  defp expensive?(["tournaments", _id, "image"]), do: true
  defp expensive?(["api", "v1", "playbook", _id]), do: true
  defp expensive?(_path), do: false

  defp throttle(conn) do
    ip = conn |> ClientIP.from_conn() |> ip_bucket()
    now = System.monotonic_time(:millisecond)
    limits = Application.fetch_env!(:codebattle, :anonymous_rate_limit)
    buckets = if expensive?(conn.path_info), do: [:burst, :reads, :expensive], else: [:burst, :reads]

    retry_ms =
      Enum.reduce(buckets, 0, fn bucket, retry_ms ->
        {limit, window} = Keyword.fetch!(limits, bucket)
        key = {bucket, ip, window, Integer.floor_div(now, window)}
        max(retry_ms, hit(key, limit, window, now))
      end)

    if retry_ms > 0, do: reject(conn, ceil(retry_ms / 1000)), else: conn
  end

  defp hit(key, limit, window, now) do
    case Cachex.incr(@cache, key) do
      {:ok, count} ->
        if count == 1, do: Cachex.expire(@cache, key, window * 2)
        if count > limit, do: window - Integer.mod(now, window), else: 0

      _error ->
        0
    end
  end

  # Privacy addresses within the same IPv6 subnet share a budget.
  defp ip_bucket({a, b, c, d, _e, _f, _g, _h}), do: {a, b, c, d, 0, 0, 0, 0}
  defp ip_bucket(ip), do: ip

  defp reject(conn, retry_after) do
    conn =
      conn
      |> put_resp_header("retry-after", to_string(retry_after))
      |> put_resp_header("cache-control", "no-store")

    conn =
      if Phoenix.Controller.get_format(conn) == "json" do
        conn
        |> put_status(:too_many_requests)
        |> Phoenix.Controller.json(%{errors: %{base: @message}})
      else
        conn
        |> put_resp_content_type("text/html")
        |> send_resp(:too_many_requests, """
        <!doctype html><html lang="en"><meta charset="utf-8">
        <title>Too many requests · Codebattle</title>
        <h1>Too many requests</h1><p>Please try again in #{retry_after} seconds.</p></html>
        """)
      end

    halt(conn)
  end
end
