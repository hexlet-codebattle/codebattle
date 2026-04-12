defmodule Codebattle.GithubStarsCache do
  @moduledoc """
  Cache GitHub repository star count to avoid loading third-party assets in the browser.
  """

  require Logger

  @cache_name :github_stats_cache
  @cache_key :codebattle_stars
  @last_successful_cache_key :codebattle_stars_last_successful
  @repo_url "https://github.com/hexlet-codebattle/codebattle"
  @ttl to_timeout(hour: 8)

  @spec get_stars_count() :: non_neg_integer() | nil
  def get_stars_count do
    case Cachex.get(@cache_name, @cache_key) do
      {:ok, count} when is_integer(count) and count >= 0 ->
        count

      _ ->
        refresh_stars_count()
    end
  end

  defp refresh_stars_count do
    case fetch_stars_count_from_html() do
      {:ok, count} ->
        Cachex.put(@cache_name, @cache_key, count, ttl: @ttl)
        Cachex.put(@cache_name, @last_successful_cache_key, count)
        count

      {:error, reason} ->
        Logger.warning("Failed to fetch GitHub stars count: #{inspect(reason)}")
        last_successful_stars_count() || fallback_stars_count()
    end
  end

  defp fetch_stars_count_from_html do
    case Req.get(@repo_url, html_request_options()) do
      {:ok, %Req.Response{status: 200, body: body}} when is_binary(body) ->
        parse_stars_count_from_html(body)

      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, {:html_error, status, body}}

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

  defp last_successful_stars_count do
    case Cachex.get(@cache_name, @last_successful_cache_key) do
      {:ok, count} when is_integer(count) and count >= 0 -> count
      _ -> nil
    end
  end

  defp fallback_stars_count do
    Application.get_env(:codebattle, :github_stars_fallback_count, 818)
  end

  defp html_request_options do
    :codebattle
    |> Application.get_env(:github_html_req_options, [])
    |> Keyword.put(:headers, html_headers())
    |> Keyword.put_new(:finch, CodebattleHTTP)
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
