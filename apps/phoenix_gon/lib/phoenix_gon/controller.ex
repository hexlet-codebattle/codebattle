defmodule PhoenixGon.Controller do
  import Plug.Conn
  import PhoenixGon.Utils

  @moduledoc """
  Adds helpers for working with gon on elixir controller modules.
  """

  @doc """
  Put variables to gon.
  """
  @spec put_gon(Plug.Conn.t(), Keyword.t() | map()) :: Plug.Conn.t()
  def put_gon(conn, opts) when is_list(opts) do
    put_gon(conn, Enum.into(opts, %{}))
  end

  def put_gon(conn, opts) when is_map(opts) do
    %PhoenixGon.Storage{assets: assets} = variables(conn)
    assets = Map.merge(assets, opts)
    put_private(conn, :phoenix_gon, %{variables(conn) | assets: assets})
  end

  @doc """
  Update variables in gon.
  """
  @spec update_gon(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def update_gon(_conn, _opts)

  @doc false
  def update_gon(conn, opts) when is_list(opts) do
    put_gon(conn, opts)
  end

  @doc false
  def update_gon(conn, opts) when is_map(opts) do
    put_gon(conn, opts)
  end

  @doc """
  Remove variable from gon.
  """
  @spec drop_gon(Plug.Conn.t(), atom() | list()) :: Plug.Conn.t()
  def drop_gon(_conn, _opts)

  @doc false
  def drop_gon(conn, key) when is_atom(key) do
    drop_gon(conn, [key])
  end

  @doc false
  def drop_gon(conn, opts) when is_list(opts) do
    %PhoenixGon.Storage{assets: assets} = variables(conn)
    assets = Map.drop(assets, opts)
    put_private(conn, :phoenix_gon, %{variables(conn) | assets: assets})
  end

  @doc """
  Returns variable.
  """
  @spec get_gon(Plug.Conn.t(), atom()) :: any()
  def get_gon(conn, key) when is_atom(key) do
    Map.get(variables(conn).assets, key)
  end
end
