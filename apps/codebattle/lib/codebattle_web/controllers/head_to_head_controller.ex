defmodule CodebattleWeb.HeadToHeadController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Game.Context

  plug(CodebattleWeb.Plugs.RequireAuth)
  plug(:put_view, CodebattleWeb.HeadToHeadView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def show(conn, %{"user_id" => user_id, "opponent_id" => opponent_id}) do
    head_to_head = Context.fetch_head_to_head_page_data(user_id, opponent_id)

    [first_player, second_player] = head_to_head.players

    conn
    |> put_meta_tags(%{
      title: "#{first_player.name} vs #{second_player.name} • H2H",
      description: "Head-to-head history between #{first_player.name} and #{second_player.name}",
      url: Routes.head_to_head_url(conn, :show, first_player.id, second_player.id)
    })
    |> put_gon(head_to_head: head_to_head)
    |> render("show.html")
  end
end
