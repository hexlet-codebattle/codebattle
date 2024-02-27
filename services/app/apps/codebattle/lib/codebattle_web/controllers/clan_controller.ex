defmodule CodebattleWeb.ClanController do
  use CodebattleWeb, :controller

  alias Codebattle.Clan

  def index(conn, _params) do
    clans = Clan.get_all()

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • List of Clans.",
      description: "List of Codebattle Clans.",
      url: Routes.clan_path(conn, :index)
    })
    |> render("index.html", %{clans: clans})
  end

  def show(conn, %{"id" => name}) do
    clan = Clan.get_by_name!(name)

    conn
    |> put_meta_tags(%{
      title: clan.name <> " • Hexlet Codebattle • Clan.",
      description: clan.name,
      url: Routes.clan_path(conn, :show, clan)
    })
    |> render("new.html")
  end
end
