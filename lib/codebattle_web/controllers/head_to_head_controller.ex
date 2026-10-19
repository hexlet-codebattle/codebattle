defmodule CodebattleWeb.HeadToHeadController do
  use CodebattleWeb, :controller

  alias Codebattle.Game.Context
  alias CodebattleWeb.Frontend
  alias CodebattleWeb.LinkPreview
  alias CodebattleWeb.OgImage

  plug(:link_preview)
  plug(CodebattleWeb.Plugs.RequireAuth)

  def show(conn, %{"user_id" => user_id, "opponent_id" => opponent_id}) do
    head_to_head = Context.fetch_head_to_head_page_data(user_id, opponent_id)

    [first_player, second_player] = head_to_head.players

    page_title = "#{first_player.name} vs #{second_player.name} • H2H"

    conn
    |> put_head_to_head_meta_tags(head_to_head)
    |> assign(:page_title, page_title)
    |> Frontend.put_layout()
    |> render_inertia("HeadToHead", %{
      "page_title" => page_title,
      "head_to_head" => head_to_head
    })
  end

  defp link_preview(%{assigns: %{current_user: %{is_guest: true}}, params: params} = conn, _opts) do
    if LinkPreview.scraper?(conn) do
      head_to_head = Context.fetch_head_to_head_page_data(params["user_id"], params["opponent_id"])

      conn
      |> put_head_to_head_meta_tags(head_to_head)
      |> LinkPreview.send_head()
    else
      conn
    end
  end

  defp link_preview(conn, _opts), do: conn

  defp put_head_to_head_meta_tags(conn, %{players: [first, second]}) do
    image = Routes.head_to_head_image_url(conn, :show, first.id, second.id)

    put_meta_tags(
      conn,
      Map.merge(OgImage.meta_image(image), %{
        title: "#{first.name} vs #{second.name} • H2H",
        description: "#{first.name} #{first.wins} : #{second.wins} #{second.name} • H2H",
        url: Routes.head_to_head_url(conn, :show, first.id, second.id)
      })
    )
  end
end
