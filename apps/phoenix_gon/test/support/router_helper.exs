defmodule RouterHelper do
  @moduledoc false
  @session Plug.Session.init(
             store: :cookie,
             key: "_app",
             encryption_salt: "yadayada",
             signing_salt: "yadayada"
           )

  defmacro __using__(_) do
    quote do
      import Plug.Conn
      import Plug.Test
      import RouterHelper
    end
  end

  def with_gon(conn, init_opts \\ []) do
    conn
    |> Map.put(:secret_key_base, String.duplicate("abcdefgh", 8))
    |> Plug.Session.call(@session)
    |> Plug.Conn.fetch_session()
    |> PhoenixGon.Pipeline.call(PhoenixGon.Pipeline.init(init_opts))
  end
end
