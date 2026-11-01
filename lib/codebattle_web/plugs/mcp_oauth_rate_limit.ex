defmodule CodebattleWeb.Plugs.McpOauthRateLimit do
  @moduledoc "Per-IP OAuth budgets, independent of browser sessions and client IDs."
  import Plug.Conn

  alias CodebattleWeb.ClientIP

  def init(opts), do: opts

  def call(conn, _opts) do
    limit = if conn.path_info == ["oauth", "register"], do: 10, else: 120
    ip = conn |> ClientIP.from_conn() |> bucket()
    minute = :second |> System.system_time() |> div(60)
    key = {:mcp_oauth, conn.path_info, ip, minute}

    case Cachex.incr(:anonymous_rate_limit_cache, key) do
      {:ok, count} ->
        if count == 1, do: Cachex.expire(:anonymous_rate_limit_cache, key, :timer.minutes(2))
        if count > limit, do: reject(conn, 429, "slow_down"), else: conn

      _ ->
        reject(conn, 503, "temporarily_unavailable")
    end
  end

  defp bucket({a, b, c, d, _, _, _, _}), do: {a, b, c, d}
  defp bucket(ip), do: ip

  defp reject(conn, status, error) do
    conn
    |> put_resp_header("cache-control", "no-store")
    |> put_resp_header("retry-after", "60")
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(%{error: error}))
    |> halt()
  end
end
