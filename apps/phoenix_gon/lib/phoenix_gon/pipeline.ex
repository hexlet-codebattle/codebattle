defmodule PhoenixGon.Pipeline do
  import Plug.Conn

  @moduledoc """
  Plug for initializing gon with settings.
  """

  @doc """
  Initializer methods. Returns map wiith configuration settings.
  """
  @spec init(Keyword.t()) :: map()
  def init(defaults) do
    %{
      env: Keyword.get(defaults, :env, Mix.env()),
      assets: Keyword.get(defaults, :assets, %{}),
      namespace: Keyword.get(defaults, :namespace, nil),
      camel_case: Keyword.get(defaults, :camel_case, false)
    }
  end

  @doc """
  Call method adds to conn %PhoenixGon.Store object with data.
  """
  @spec call(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def call(conn, defaults) do
    session_gon = get_session(conn, "phoenix_gon")

    conn = put_private(conn, :phoenix_gon, session_gon || variables_with(defaults))

    register_before_send(conn, fn conn ->
      gon = conn.private.phoenix_gon
      assets_size = map_size(gon.assets || %{})

      cond do
        is_nil(session_gon) and assets_size == 0 ->
          conn

        assets_size > 0 and conn.status in 300..308 ->
          put_session(conn, "phoenix_gon", gon)

        true ->
          delete_session(conn, "phoenix_gon")
      end
    end)
  end

  @doc false
  @spec variables_with(map()) :: PhoenixGon.Storage.t()
  defp variables_with(%{assets: fun} = defaults) when is_function(fun), do: variables_with(Map.merge(defaults, %{assets: fun.()}))
  defp variables_with(defaults), do: Map.merge(%PhoenixGon.Storage{}, defaults)

end
