defmodule CodebattleWeb.HallOfFameController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  def index(conn, _params) do
    top10 = Codebattle.User.get_nearby_users(%{id: nil, rank: 1}, 9)

    conn
    |> put_meta_tags(%{
      title: "Codebattle Hall of Fame",
      description: "Hall of Fame for Codebattle League"
    })
    |> put_gon(%{top10: top10})
    |> render("index.html")
  end
end
