defmodule CodebattleWeb.HeadToHeadController do
  use CodebattleWeb, :controller

  alias Codebattle.Game.Context

  plug(CodebattleWeb.Plugs.RequireAuth)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def show(conn, %{"user_id" => user_id, "opponent_id" => opponent_id}) do
    head_to_head = Context.fetch_head_to_head_page_data(user_id, opponent_id)

    [first_player, second_player] = head_to_head.players

    page_title = "#{first_player.name} vs #{second_player.name} • H2H"

    conn
    |> put_meta_tags(%{
      title: page_title,
      description: "Head-to-head history between #{first_player.name} and #{second_player.name}",
      url: Routes.head_to_head_url(conn, :show, first_player.id, second_player.id)
    })
    |> assign(:page_title, page_title)
    |> render_inertia("HeadToHead", %{
      "page_title" => page_title,
      "head_to_head" => head_to_head
    })
  end
end
