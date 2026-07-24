defmodule CodebattleWeb.ClanController do
  use CodebattleWeb, :controller

  alias Codebattle.Clan
  alias Codebattle.User

  @valid_sorts ~w(name players_count created_at)
  @valid_orders ~w(asc desc)

  plug(CodebattleWeb.Plugs.RequireAuth)

  plug(:put_view, CodebattleWeb.ClanView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, params) do
    sort = normalize_param(params["sort"], @valid_sorts, "name")
    order = normalize_param(params["order"], @valid_orders, "asc")
    clans = Clan.list_with_stats(sort: sort, order: order, preload: :creator)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • List of Clans.",
      description: "List of Codebattle Clans.",
      url: Routes.clan_path(conn, :index)
    })
    |> render("index.html", %{clans: clans, order: order, sort: sort, total_clans: length(clans)})
  end

  def show(conn, %{"id" => id}) do
    clan = Clan.get!(id, [:creator, :users])
    clan_name = clan.name || gettext("Unnamed clan")

    conn
    |> put_meta_tags(%{
      title: clan_name <> " • Hexlet Codebattle • Clan.",
      description: clan.long_name || clan_name,
      url: Routes.clan_path(conn, :show, clan)
    })
    |> render("show.html", %{clan: clan})
  end

  def delete(conn, %{"id" => id}) do
    if User.admin?(conn.assigns.current_user) do
      id
      |> Clan.get!()
      |> Clan.delete()
      |> case do
        {:ok, _clan} ->
          conn
          |> put_flash(:info, "Clan deleted successfully")
          |> redirect(to: Routes.clan_path(conn, :index))

        {:error, _changeset} ->
          conn
          |> put_flash(:danger, "Failed to delete clan")
          |> redirect(to: Routes.clan_path(conn, :index))
      end
    else
      conn
      |> put_flash(:danger, "You must be admin to delete clans")
      |> redirect(to: Routes.clan_path(conn, :index))
    end
  end

  defp normalize_param(value, valid_values, default) do
    if value in valid_values, do: value, else: default
  end
end
