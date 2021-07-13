defmodule CodebattleWeb.Api.V1.LangStatsController do
  use CodebattleWeb, :controller

  def show(conn, %{"user_id" => _user_id}) do
    # TODO: think about data structure
    json(
      conn,
      %{
        data: [
          %{title: "One", value: 10, color: "#E38627"},
          %{title: "Two", value: 15, color: "#C13C37"},
          %{title: "Three", value: 20, color: "#6A2135"}
        ]
      }
    )
  end
end