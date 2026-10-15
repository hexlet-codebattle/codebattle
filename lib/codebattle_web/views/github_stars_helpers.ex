defmodule CodebattleWeb.GithubStarsHelpers do
  @moduledoc false

  alias Codebattle.GithubStarsCache

  def github_stars_count_text, do: format_count(GithubStarsCache.get_stars_count())

  defp format_count(count) when count >= 1_000_000 do
    "#{(count / 1_000_000) |> Float.round(1) |> trim_trailing_zero()}M"
  end

  defp format_count(count) when count >= 1_000 do
    "#{(count / 1_000) |> Float.round(1) |> trim_trailing_zero()}k"
  end

  defp format_count(count), do: Integer.to_string(count)

  defp trim_trailing_zero(value) do
    value
    |> :erlang.float_to_binary(decimals: 1)
    |> String.replace_suffix(".0", "")
  end
end
