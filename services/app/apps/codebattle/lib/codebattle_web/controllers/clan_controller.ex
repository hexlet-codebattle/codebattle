defmodule CodebattleWeb.ClanController do
  use CodebattleWeb, :controller

  alias Codebattle.Clan

  plug(CodebattleWeb.Plugs.RequireAuth)

  def index(conn, _params) do
    clans = Clan.get_all(:creator)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • List of Clans.",
      description: "List of Codebattle Clans.",
      url: Routes.clan_path(conn, :index)
    })
    |> render("index.html", %{clans: clans})
  end

  def show(conn, %{"id" => id}) do
    clan = Clan.get!(id, [:creator, :users])

    conn
    |> put_meta_tags(%{
      title: clan.name <> " • Hexlet Codebattle • Clan.",
      description: clan.long_name,
      url: Routes.clan_path(conn, :show, clan)
    })
    |> render("show.html", %{clan: clan})
  end
end
