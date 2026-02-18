defmodule Codebattle.SeasonCache do
  @moduledoc """
  Cachex-based cache for the current season to avoid repeated database queries.
  Cache is invalidated daily and on season updates.
  """

  @cache_name :season_cache
  @cache_key :current_season
  @ttl to_timeout(day: 1)

  @spec get_current_season() :: Codebattle.Season.t() | nil
  def get_current_season do
    @cache_name
    |> Cachex.fetch(@cache_key, fn _key ->
      case Codebattle.Season.fetch_current_season_from_db() do
        nil -> {:ignore, nil}
        season -> {:commit, season, ttl: @ttl}
      end
    end)
    |> case do
      {:commit, season} -> season
      {:ok, season} -> season
      {:ignore, nil} -> nil
      {:error, _} -> nil
    end
  end

  @spec invalidate() :: :ok
  def invalidate do
    Cachex.del(@cache_name, @cache_key)
    :ok
  end
end
