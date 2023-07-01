defmodule CodebattleWeb.Api.V1.PlayerReportController do
  use CodebattleWeb, :controller

  def show(conn, %{}) do
    json(conn, %{
      raz: 42
    })
  end
end
