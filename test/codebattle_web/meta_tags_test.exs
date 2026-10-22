defmodule CodebattleWeb.MetaTagsTest do
  use CodebattleWeb.ConnCase, async: true

  alias CodebattleWeb.MetaTags
  alias CodebattleWeb.OgImage

  describe "render_tags_all/1" do
    test "escapes text and attributes while preserving social overrides and nested tags" do
      html =
        %{
          title: "<script>alert(1)</script> & title",
          description: ~s(A "quoted" description),
          og: %{title: "Social title", image: "https://example.com/card.png"},
          twitter: %{title: "Twitter title", creator: "@codebattle"}
        }
        |> MetaTags.render_tags_all()
        |> Phoenix.HTML.Safe.to_iodata()
        |> IO.iodata_to_binary()

      assert html =~ "<title>&lt;script&gt;alert(1)&lt;/script&gt; &amp; title</title>"
      assert html =~ ~s(content="A &quot;quoted&quot; description" name="description")
      assert html =~ ~s(content="Social title" property="og:title")
      assert html =~ ~s(content="Twitter title" name="twitter:title")
      assert html =~ ~s(content="@codebattle" name="twitter:creator")
      assert html =~ ~s(content="https://example.com/card.png" property="og:image")
      refute html =~ "<script>"
    end
  end

  describe "build/2" do
    test "falls back to the site defaults with this page as og:url" do
      tags = MetaTags.build(build_conn(:get, "/hall_of_fame"), %{title: "Hall of Fame"})

      assert tags["title"] == "Hall of Fame"
      assert tags["url"] == CodebattleWeb.Endpoint.url() <> "/hall_of_fame"
      assert tags["og:site_name"] == "Codebattle"
      assert tags["og:locale"] == "en_US"
      assert tags["og:image:alt"] == "Hall of Fame"
      refute Enum.any?(Map.keys(tags), &String.starts_with?(&1, "fb:"))
    end

    test "sizes the stock card" do
      tags = MetaTags.build(build_conn(:get, "/"), nil)

      assert tags["image"] =~ "/assets/images/opengraph-main.jpg"
      assert tags["og:image:width"] == 2400
      assert tags["og:image:height"] == 1260
      assert tags["og:image:type"] == "image/jpeg"
    end

    test "keeps the page's own url and preview card" do
      page = Map.put(OgImage.meta_image("https://example.com/games/1/image"), :url, "https://example.com/games/1")
      tags = MetaTags.build(build_conn(:get, "/games/1"), page)

      assert tags["url"] == "https://example.com/games/1"
      assert tags["image"] == "https://example.com/games/1/image"
      assert tags["og:image:width"] == 1200
      assert tags["og:image:type"] == "image/png"
    end
  end

  test "the layout renders the page's og:url and image size", %{conn: conn} do
    html = conn |> get("/hall_of_fame") |> html_response(200)

    assert html =~ ~s(content="#{CodebattleWeb.Endpoint.url()}/hall_of_fame" property="og:url")
    assert html =~ ~s(content="2400" property="og:image:width")
    assert html =~ ~s(content="Codebattle" property="og:site_name")
  end

  describe "tournament link preview" do
    test "answers a guest scraper with the tournament card", %{conn: conn} do
      tournament = insert(:tournament, name: "Autumn Cup", state: "upcoming")

      html =
        conn
        |> put_req_header("user-agent", "TelegramBot (like TwitterBot)")
        |> get(Routes.tournament_path(conn, :show, tournament.id))
        |> html_response(200)

      assert html =~ "Autumn Cup"

      assert html =~
               ~s(content="#{Routes.tournament_image_url(CodebattleWeb.Endpoint, :show, tournament.id)}" property="og:image")

      assert html =~ ~s(content="1200" property="og:image:width")
    end

    test "shows a guest browser the public tournament page with the card", %{conn: conn} do
      tournament = insert(:tournament, name: "Autumn Cup", state: "upcoming")

      html =
        conn
        |> put_req_header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        |> get(Routes.tournament_path(conn, :show, tournament.id))
        |> html_response(200)

      assert html =~ "TournamentPublic"

      assert html =~
               ~s(content="#{Routes.tournament_image_url(CodebattleWeb.Endpoint, :show, tournament.id)}" property="og:image")
    end
  end
end
