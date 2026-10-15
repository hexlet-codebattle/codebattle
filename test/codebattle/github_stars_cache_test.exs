defmodule Codebattle.GithubStarsCacheTest do
  use ExUnit.Case, async: false

  alias Codebattle.GithubStarsCache

  setup do
    Cachex.clear(:github_stats_cache)
    :ok
  end

  test "refresh fetches stars count and readers use the cached value" do
    parent = self()

    Req.Test.stub(Codebattle.GithubApi, fn req ->
      %{request_path: "/hexlet-codebattle/codebattle", method: "GET", host: "github.com"} = req
      send(parent, :github_request)
      Req.Test.html(req, ~s(<script>{"stargazerCount":12345}</script>))
    end)

    assert GithubStarsCache.refresh() == {:ok, 12_345}
    assert_receive :github_request

    assert GithubStarsCache.get_stars_count() == 12_345
    refute_receive :github_request, 50
  end

  test "parses aria label fallback from html" do
    Req.Test.stub(Codebattle.GithubApi, fn req ->
      Req.Test.html(req, ~s(<a aria-label="4,321 users starred this repository"></a>))
    end)

    assert GithubStarsCache.refresh() == {:ok, 4321}
    assert GithubStarsCache.get_stars_count() == 4321
  end

  test "keeps the last successful value when refresh fails" do
    Req.Test.stub(Codebattle.GithubApi, fn req ->
      Req.Test.html(req, ~s(<script>{"stargazerCount":111}</script>))
    end)

    assert {:ok, 111} = GithubStarsCache.refresh()

    Req.Test.stub(Codebattle.GithubApi, fn req ->
      req
      |> Plug.Conn.put_status(500)
      |> Req.Test.html("<html></html>")
    end)

    assert {:error, {:html_error, 500}} = GithubStarsCache.refresh()
    assert GithubStarsCache.get_stars_count() == 111
  end

  test "readers never hit github and get the fallback before the first refresh" do
    Req.Test.stub(Codebattle.GithubApi, fn _req -> flunk("readers must not fetch from GitHub") end)

    assert GithubStarsCache.get_stars_count() == 818
  end

  test "returns the fallback value when the page cannot be parsed" do
    Req.Test.stub(Codebattle.GithubApi, fn req -> Req.Test.html(req, "<html></html>") end)

    assert {:error, :html_parse_failed} = GithubStarsCache.refresh()
    assert GithubStarsCache.get_stars_count() == 818
  end
end
