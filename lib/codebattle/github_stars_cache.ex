defmodule Codebattle.GithubStarsCache do
  @moduledoc """
  Cache GitHub repository star count to avoid loading third-party assets in the browser.

  Every page reads the count (header branding), so it never fetches on the request path:
  this server refreshes it in the background, and readers fall back to the last known
  value (or the configured fallback) while GitHub is slow, rate-limiting or unreachable.
  """

  use GenServer

  require Logger

  @cache_name :github_stats_cache
  @cache_key :codebattle_stars
  @repo_url "https://github.com/hexlet-codebattle/codebattle"
  @refresh_interval to_timeout(hour: 8)
  @retry_interval to_timeout(minute: 15)

  def start_link(_opts), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @spec get_stars_count() :: non_neg_integer()
  def get_stars_count do
    case Cachex.get(@cache_name, @cache_key) do
      {:ok, count} when is_integer(count) and count >= 0 -> count
      _ -> fallback_stars_count()
    end
  end

  @doc "Fetches the count from GitHub and caches it; the cache keeps the old value on failure."
  @spec refresh() :: {:ok, non_neg_integer()} | {:error, term()}
  def refresh do
    case fetch_stars_count_from_html() do
      {:ok, count} ->
        Cachex.put(@cache_name, @cache_key, count)
        {:ok, count}

      {:error, reason} = error ->
        Logger.warning("Failed to fetch GitHub stars count: #{inspect(reason)}")
        error
    end
  end

  @impl true
  def init(:ok) do
    if Application.get_env(:codebattle, :github_stars_refresh, true), do: send(self(), :refresh)
    {:ok, nil}
  end

  @impl true
  def handle_info(:refresh, state) do
    interval =
      case refresh() do
        {:ok, _count} -> @refresh_interval
        {:error, _reason} -> @retry_interval
      end

    Process.send_after(self(), :refresh, interval)
    {:noreply, state}
  end

  defp fetch_stars_count_from_html do
    case Req.get(@repo_url, html_request_options()) do
      {:ok, %Req.Response{status: 200, body: body}} when is_binary(body) ->
        parse_stars_count_from_html(body)

      {:ok, %Req.Response{status: status}} ->
        {:error, {:html_error, status}}

      {:error, reason} ->
        {:error, {:html_request_failed, reason}}
    end
  end

  defp parse_stars_count_from_html(body) do
    case Regex.run(~r/\"stargazerCount\"\s*:\s*(\d+)/, body, capture: :all_but_first) ||
           Regex.run(~r/aria-label=\"([\d,]+)\s+users\s+starred\s+this\s+repository\"/, body, capture: :all_but_first) do
      [count] ->
        {parsed_count, ""} =
          count
          |> String.replace(",", "")
          |> Integer.parse()

        {:ok, parsed_count}

      _ ->
        {:error, :html_parse_failed}
    end
  end

  defp fallback_stars_count do
    Application.get_env(:codebattle, :github_stars_fallback_count, 818)
  end

  defp html_request_options do
    :codebattle
    |> Application.get_env(:github_html_req_options, [])
    |> Keyword.put(:headers, html_headers())
    |> Keyword.put_new(:finch, name: CodebattleHTTP, pool_timeout: 3_000)
    |> Keyword.put_new(:retry, false)
    |> Keyword.put_new(:receive_timeout, 5_000)
  end

  defp html_headers do
    base_headers("text/html,application/xhtml+xml")
  end

  defp base_headers(accept_header) do
    base = [
      {"accept", accept_header},
      {"user-agent", "codebattle-github-stars"}
    ]

    base
  end
end
