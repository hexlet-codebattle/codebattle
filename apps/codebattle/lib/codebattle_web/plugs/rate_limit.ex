defmodule CodebattleWeb.Plugs.RateLimit do
  @moduledoc """
  Fixed-window, per-IP rate limiting for the unauthenticated auth endpoints
  (sign up / sign in / password reset), backed by the `:auth_rate_limit_cache`
  Cachex instance.

  It guards against credential brute-forcing, verification/reset email bombing
  and Firebase quota abuse. The counter fails open: a cache error never blocks
  legitimate traffic.

  Usage (per action):

      plug CodebattleWeb.Plugs.RateLimit,
        [bucket: "sign_in", limit: 20, window: to_timeout(minute: 5)] when action in [:create]

  Disabled globally when `config :codebattle, :auth_rate_limit_enabled` is
  false (e.g. in the test environment).
  """
  import Plug.Conn

  @cache :auth_rate_limit_cache

  def init(opts) do
    %{
      bucket: Keyword.fetch!(opts, :bucket),
      limit: Keyword.get(opts, :limit, 10),
      window: Keyword.get(opts, :window, to_timeout(minute: 1))
    }
  end

  def call(conn, %{bucket: bucket, limit: limit, window: window}) do
    if enabled?() do
      throttle(conn, bucket, limit, window)
    else
      conn
    end
  end

  defp throttle(conn, bucket, limit, window) do
    key = "#{bucket}:#{client_ip(conn)}"

    case Cachex.incr(@cache, key) do
      {:ok, attempts} ->
        if attempts == 1, do: Cachex.expire(@cache, key, window)

        if attempts > limit, do: reject(conn), else: conn

      _error ->
        # Fail open: don't block real users if the cache is unavailable.
        conn
    end
  end

  defp reject(conn) do
    conn
    |> put_status(:too_many_requests)
    |> Phoenix.Controller.json(%{errors: %{base: "Too many attempts. Please try again later."}})
    |> halt()
  end

  # Prefer the forwarded client IP (the app runs behind a proxy) and fall back
  # to the direct peer address.
  defp client_ip(conn) do
    case get_req_header(conn, "x-forwarded-for") do
      [forwarded | _] ->
        forwarded
        |> String.split(",")
        |> List.first()
        |> String.trim()

      [] ->
        conn.remote_ip |> :inet.ntoa() |> to_string()
    end
  end

  defp enabled?, do: Application.get_env(:codebattle, :auth_rate_limit_enabled, true)
end
