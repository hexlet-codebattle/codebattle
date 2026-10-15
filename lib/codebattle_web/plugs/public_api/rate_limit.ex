defmodule CodebattleWeb.Plugs.PublicApi.RateLimit do
  @moduledoc """
  Per-user fixed-window limits for the public API (shared by all tokens of the user; IP is
  not used). Also bans a user for an hour after too many 404s — that's id probing.
  Fails open: a cache error never blocks traffic.
  """
  import Plug.Conn

  alias CodebattleWeb.PublicApi.V1.ErrorJSON

  @cache :public_api_rate_limit_cache

  def init(opts), do: opts

  def call(conn, _opts) do
    user_id = conn.assigns.current_user.id
    {limit, window_ms} = Application.get_env(:codebattle, :public_api_rate_limit, {60, to_timeout(minute: 1)})

    if probing_banned?(user_id) do
      ErrorJSON.halt_with(conn, 429, "rate_limited", "Too many not found responses, try again later")
    else
      case hit("requests:#{user_id}", window_ms) do
        count when count > limit ->
          conn
          |> put_resp_header("retry-after", to_string(div(window_ms, 1000)))
          |> ErrorJSON.halt_with(429, "rate_limited", "Too many requests")

        count ->
          conn
          |> put_resp_header("x-ratelimit-limit", to_string(limit))
          |> put_resp_header("x-ratelimit-remaining", to_string(max(limit - count, 0)))
          |> register_before_send(&track_not_found(&1, user_id))
      end
    end
  end

  defp track_not_found(%{status: 404} = conn, user_id) do
    {limit, window_ms, ban_ms} =
      Application.get_env(:codebattle, :public_api_not_found_limit, {30, to_timeout(minute: 10), to_timeout(hour: 1)})

    if hit("not_found:#{user_id}", window_ms) > limit do
      Cachex.put(@cache, "probing_ban:#{user_id}", true, expire: ban_ms)
    end

    conn
  end

  defp track_not_found(conn, _user_id), do: conn

  defp probing_banned?(user_id) do
    match?({:ok, true}, Cachex.get(@cache, "probing_ban:#{user_id}"))
  end

  defp hit(key, window_ms) do
    case Cachex.incr(@cache, key) do
      {:ok, 1} ->
        Cachex.expire(@cache, key, window_ms)
        1

      {:ok, count} ->
        count

      _error ->
        0
    end
  end
end
