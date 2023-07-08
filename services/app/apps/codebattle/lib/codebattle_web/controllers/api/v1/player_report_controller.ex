defmodule CodebattleWeb.Api.V1.PlayerReportController do
  use CodebattleWeb, :controller

  def index(conn, params) do
  end

  def show(conn, params) do
    json(conn, %{
      raz: 42
    })
  end

  def create(conn, params) do
  end
end
