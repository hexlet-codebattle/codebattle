defmodule CodebattleWeb.LayoutView do
  use CodebattleWeb, :view

  import CodebattleWeb.Router.Helpers
  import PhoenixGon.View

  @colors [
    "2AE881",
    "73CCFE",
    "B6A4FF",
    "FF621E",
    "FF9C41",
    "FFE500"
  ]

  @doc """
  Returns the path for a static asset with cache busting support.
  In dev, returns the original path. In prod, returns the hashed path from manifest.
  """
  def static_asset(path) do
    CodebattleWeb.Vite.static_asset_path(path)
  end

  def get_next_path(conn) do
    next = conn.params["next"]

    case next do
      "" -> conn.request_path
      nil -> conn.request_path
      _ -> next
    end
  end

  def app_short_version do
    case app_version() do
      "" -> "undefined"
      version -> String.slice(version, 0, 7)
    end
  end

  def github_commit_link do
    case app_version() do
      "" -> "/"
      version -> "https://github.com/hexlet-codebattle/codebattle/commit/#{version}"
    end
  end

  def deployed_at do
    Application.get_env(:codebattle, :deployed_at)
  end

  def collab_logo(%{collab_logo: logo}) when not is_nil(logo), do: logo

  def collab_logo(_user) do
    Application.get_env(:codebattle, :collab_logo)
  end

  def collab_logo_minor(_user) do
    Application.get_env(:codebattle, :collab_logo_minor)
  end

  def user_rank(user) do
    # if Application.get_env(:codebattle, :use_event_rank) do
    #   # TODO: add user rating from event
    #   0
    # else
    user.rank
    # end
  end

  def user_rating(user) do
    # if Application.get_env(:codebattle, :use_event_rating) do
    #   # TODO: add user rating from event
    #   0
    # else
    user.rating
    # end
  end

  def avatar_url(user) do
    case user.avatar_url do
      avatar_url when is_binary(avatar_url) and avatar_url != "" -> avatar_url
      _ -> default_avatar_url(user.name)
    end
  end

  defp default_avatar_url(name) do
    normalized_name = normalize_name(name)
    background_color = get_background_color(normalized_name)
    initials = normalized_name |> get_initials() |> escape_xml_text()

    svg = """
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
      <rect width='128' height='128' fill='##{background_color}' />
      <text x='50%' y='50%' dy='.1em' fill='#ffffff' font-family='Arial,sans-serif' font-size='48' font-weight='700' text-anchor='middle'>#{initials}</text>
    </svg>
    """

    "data:image/svg+xml," <> URI.encode(svg, &URI.char_unreserved?/1)
  end

  defp get_background_color(name) do
    Enum.at(@colors, rem(String.length(name), length(@colors)))
  end

  defp normalize_name(name) when is_binary(name) do
    case String.trim(name) do
      "" -> "?"
      normalized_name -> normalized_name
    end
  end

  defp normalize_name(_name), do: "?"

  defp get_initials(name) do
    case_result =
      case String.split(name, ~r/\s+/u, trim: true) do
        [] ->
          "?"

        [single_name] ->
          String.slice(single_name, 0, 2)

        name_parts ->
          name_parts
          |> Enum.take(2)
          |> Enum.map_join(&String.first/1)
      end

    String.upcase(case_result)
  end

  defp escape_xml_text(value) do
    value
    |> String.replace("&", "&amp;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
  end

  defp app_version do
    Application.get_env(:codebattle, :app_version, "")
  end
end
