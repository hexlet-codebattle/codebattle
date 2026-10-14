defmodule CodebattleWeb.ClanController do
  use CodebattleWeb, :controller

  alias Codebattle.Clan
  alias Codebattle.User
  alias CodebattleWeb.Frontend
  alias CodebattleWeb.Frontend.Present

  @valid_sorts ~w(name players_count created_at)
  @valid_orders ~w(asc desc)

  plug(CodebattleWeb.Plugs.RequireAuth)

  def index(conn, params) do
    sort = normalize_param(params["sort"], @valid_sorts, "name")
    order = normalize_param(params["order"], @valid_orders, "asc")
    clans = Clan.list_with_stats(sort: sort, order: order, preload: :creator)

    conn =
      put_meta_tags(conn, %{
        title: "Hexlet Codebattle • List of Clans.",
        description: "List of Codebattle Clans.",
        url: Routes.clan_path(conn, :index)
      })

    conn
    |> Frontend.put_layout()
    |> render_inertia("ClanIndex", %{
      "clans" => Enum.map(clans, &Present.clan/1),
      "sort" => sort,
      "order" => order
    })
  end

  def show(conn, %{"id" => id}) do
    clan = Clan.get!(id, [:creator, :users])
    clan_name = clan.name || gettext("Unnamed clan")

    conn =
      put_meta_tags(conn, %{
        title: clan_name <> " • Hexlet Codebattle • Clan.",
        description: clan.long_name || clan_name,
        url: Routes.clan_path(conn, :show, clan)
      })

    conn
    |> Frontend.put_layout()
    |> render_inertia("ClanShow", %{
      "clan" => Present.clan(clan),
      "members" => Enum.map(clan.users, &Present.clan_member/1),
      "can_edit" => Clan.can_edit?(clan, conn.assigns.current_user)
    })
  end

  def create(conn, %{"clan" => params}) do
    case Clan.create_by(conn.assigns.current_user, params, params["join"] in [true, "true"]) do
      {:ok, clan} ->
        conn
        |> put_flash(:success, gettext("Clan created"))
        |> redirect(to: Routes.clan_path(conn, :show, clan))

      {:error, changeset} ->
        conn
        |> assign_errors(changeset)
        |> redirect(to: Routes.clan_path(conn, :index))
    end
  end

  def update(conn, %{"id" => id, "clan" => params}) do
    clan = Clan.get!(id)

    if Clan.can_edit?(clan, conn.assigns.current_user) do
      case Clan.rename(clan, params) do
        {:ok, clan} ->
          conn
          |> put_flash(:success, gettext("Clan updated"))
          |> redirect(to: Routes.clan_path(conn, :show, clan))

        {:error, changeset} ->
          conn
          |> assign_errors(changeset)
          |> redirect(to: Routes.clan_path(conn, :show, clan))
      end
    else
      conn
      |> put_flash(:danger, gettext("Only the clan creator or an admin can edit it"))
      |> redirect(to: Routes.clan_path(conn, :show, clan))
    end
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
