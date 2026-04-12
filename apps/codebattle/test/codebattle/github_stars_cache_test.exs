defmodule Codebattle.GithubStarsCacheTest do
  use ExUnit.Case, async: false

  alias Codebattle.GithubStarsCache

  setup do
    Cachex.clear(:github_stats_cache)

    Req.Test.stub(Codebattle.GithubApi, fn req ->
      %{request_path: "/hexlet-codebattle/codebattle", method: "GET", host: "github.com"} = req
      Req.Test.html(req, ~s(<script>{"stargazerCount":0}</script>))
    end)

    :ok
  end

  test "fetches stars count and caches the result" do
    parent = self()

    Req.Test.stub(Codebattle.GithubApi, fn req ->
      send(parent, {:github_request, req.request_path})
      Req.Test.html(req, ~s(<script>{"stargazerCount":12345}</script>))
    end)

    assert GithubStarsCache.get_stars_count() == 12_345
    assert_receive {:github_request, "/hexlet-codebattle/codebattle"}

    assert GithubStarsCache.get_stars_count() == 12_345
    refute_receive {:github_request, _request_path}, 50
  end

  test "parses aria label fallback from html" do
    Req.Test.stub(Codebattle.GithubApi, fn req ->
      %{request_path: "/hexlet-codebattle/codebattle", method: "GET", host: "github.com"} = req
      Req.Test.html(req, ~s(<a aria-label="4,321 users starred this repository"></a>))
    end)

    assert GithubStarsCache.get_stars_count() == 4321
  end

  test "returns last successful value when refresh fails" do
    Req.Test.stub(Codebattle.GithubApi, fn req ->
      %{request_path: "/hexlet-codebattle/codebattle", method: "GET", host: "github.com"} = req
      Req.Test.html(req, ~s(<script>{"stargazerCount":111}</script>))
    end)

    assert GithubStarsCache.get_stars_count() == 111

    Cachex.expire(:github_stats_cache, :codebattle_stars, 0)

    Req.Test.stub(Codebattle.GithubApi, fn req ->
      req
      |> Req.Test.html("<html></html>")
      |> Map.put(:status, 500)
    end)

    assert GithubStarsCache.get_stars_count() == 111
  end

  test "returns fallback value when github request fails" do
    Req.Test.stub(Codebattle.GithubApi, fn req ->
      %{request_path: "/hexlet-codebattle/codebattle", method: "GET", host: "github.com"} = req
      Req.Test.html(req, "<html></html>")
    end)

    assert GithubStarsCache.get_stars_count() == 818
  end
end
