defmodule CodebattleWeb.GithubStarsHelpers do
  @moduledoc false

  use Phoenix.Component

  alias Codebattle.GithubStarsCache

  attr(:class, :string, default: nil)

  def github_stars_badge(assigns) do
    ~H"""
    <span class={["github-stars-badge", @class]}>
      <span class="github-stars-badge__main">
        <img
          alt=""
          aria-hidden="true"
          class="github-stars-badge__icon"
          src={CodebattleWeb.Vite.static_asset_path("images/landing/github.svg")}
        />
        <span class="github-stars-badge__label">Stars</span>
      </span>
      <span class="github-stars-badge__count">{github_stars_count_text()}</span>
    </span>
    """
  end

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
