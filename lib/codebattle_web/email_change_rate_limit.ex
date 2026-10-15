defmodule CodebattleWeb.EmailChangeRateLimit do
  @moduledoc """
  Limits Firebase email-change initiation by both authenticated account and
  client IP. Every valid initiation attempt consumes quota, including attempts
  with a wrong password, so valid credentials cannot be used for email bombing.

  The cache is local to the Codebattle node. Production currently runs one
  Codebattle replica; replace this cache with a shared store before scaling the
  web application horizontally.
  """

  alias CodebattleWeb.Plugs.RateLimit

  @cache :email_change_rate_limit_cache
  @account_limit 3
  @ip_limit 10
  @window to_timeout(minute: 15)

  @spec consume(Plug.Conn.t(), pos_integer()) :: :ok | {:error, :rate_limited}
  def consume(conn, user_id) do
    results = [
      increment({:account, user_id}, @account_limit),
      increment({:ip, RateLimit.client_ip(conn)}, @ip_limit)
    ]

    if :rate_limited in results, do: {:error, :rate_limited}, else: :ok
  end

  defp increment(key, limit) do
    case Cachex.incr(@cache, key) do
      {:ok, attempts} ->
        if attempts == 1, do: Cachex.expire(@cache, key, @window)
        if attempts > limit, do: :rate_limited, else: :ok

      _error ->
        # Fail open if the cache is unavailable; Firebase still applies its own
        # abuse controls and no authorization decision relies on this counter.
        :ok
    end
  end
end
