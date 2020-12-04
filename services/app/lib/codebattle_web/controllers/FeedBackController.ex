defmodule CodebattleWeb.Api.V1.FeedBackController do
  use CodebattleWeb, :controller
  def index(conn, _params) do
    json(conn, %{})
  end
end