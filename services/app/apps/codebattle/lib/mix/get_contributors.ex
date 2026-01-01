defmodule Mix.Tasks.GetContributors do
  @shortdoc "Get contributors for landing"
  @moduledoc false

  use Mix.Task

  @repos %{
    codebattle: "https://api.github.com/repos/hexlet-codebattle/codebattle/contributors?per_page=1000",
    tasks: "https://api.github.com/repos/hexlet-codebattle/tasks/contributors?per_page=1000"
  }

  def run(_args) do
    {:ok, _started} = Application.ensure_all_started(:req)

    Enum.each(@repos, fn {repo_name, url} ->
      resp = Req.get!(url, headers: github_headers())

      case resp.status do
        200 ->
          resp.body
          |> Enum.filter(&(&1["type"] == "User"))
          |> Enum.sort_by(& &1["contributions"], :desc)
          |> Enum.map(&Map.take(&1, ["html_url", "login", "contributions", "avatar_url"]))
          |> Enum.map_join("", &template/1)
          |> write_file(repo_name)

        status ->
          Mix.raise("""
          GitHub API error for #{repo_name} (status #{status}):

          #{inspect(resp.body)}
          """)
      end
    end)
  end

  defp github_headers do
    base = [
      # GitHub likes having this
      {"user-agent", "codebattle-contributors-task"}
    ]

    case System.get_env("GITHUB_TOKEN") do
      nil -> base
      token -> [{"authorization", "Bearer #{token}"} | base]
    end
  end

  defp write_file(content, repo_name) do
    File.cwd!()
    |> Path.join("apps/codebattle/lib/codebattle_web/templates/root/_contributors_#{repo_name}.html.heex")
    |> File.write!(content)
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
