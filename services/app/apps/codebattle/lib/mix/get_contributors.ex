defmodule Mix.Tasks.GetContributors do
  @moduledoc false

  use Mix.Task

  @shortdoc "Get contributors for landing"

  @repos %{
    codebattle:
      ~c"https://api.github.com/repos/hexlet-codebattle/codebattle/contributors?per_page=1000",
    asserts:
      ~c"https://api.github.com/repos/hexlet-codebattle/battle_asserts/contributors?per_page=1000",
    extension:
      ~c"https://api.github.com/repos/hexlet-codebattle/chrome_extension/contributors?per_page=1000"
  }

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:httpoison)

    @repos
    |> Enum.each(fn {repo_name, url} ->
      content =
        url
        |> HTTPoison.get!()
        |> Map.get(:body)
        |> Jason.decode!()
        |> Enum.filter(fn params -> params["type"] == "User" end)
        |> Enum.sort_by(fn params -> params["contributions"] end)
        |> Enum.reverse()
        |> Enum.map(&Map.take(&1, ["html_url", "login", "contributions", "avatar_url"]))
        |> Enum.map_join("", fn params -> template(params) end)

      File.cwd!()
      |> Path.join(
        "apps/codebattle/lib/codebattle_web/templates/root/_contributors_#{repo_name}.html.heex"
      )
      |> File.write!(content)
    end)
  end

  defp template(params) do
    """
    <a href="#{params["html_url"]}" target="_blank" title="#{params["login"]} #{params["contributions"]}">
      <div class="m-1">
        <img
          alt="#{params["login"]}"
          class="rounded-circle contributor-img"
          src="#{params["avatar_url"]}"
        />
      </div>
    </a>
    """
  end
end
