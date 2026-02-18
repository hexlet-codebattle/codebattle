defmodule CodebattleWeb.Api.V1.StreamConfigController do
  use CodebattleWeb, :controller

  alias Codebattle.StreamConfig

  def index(conn, _params) do
    configs = StreamConfig.get_all(conn.assigns.current_user.id)
    json(conn, %{items: configs})
  end

  def put_all(conn, %{"configs" => configs}) do
    updated_configs = StreamConfig.upsert(conn.assigns.current_user.id, configs)
    json(conn, %{items: updated_configs})
  end
end
