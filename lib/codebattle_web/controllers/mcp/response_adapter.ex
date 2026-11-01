defmodule CodebattleWeb.Mcp.ResponseAdapter do
  @moduledoc """
  Captures an allowlisted Public API controller's JSON response in memory.
  It never opens a socket or sends the response to the MCP HTTP connection.
  Streaming, files and upgrades are deliberately unsupported.
  """
  @behaviour Plug.Conn.Adapter

  @impl true
  def send_resp(state, _status, _headers, body), do: {:ok, IO.iodata_to_binary(body), state}

  @impl true
  def read_req_body(state, _opts), do: {:ok, "", state}

  @impl true
  @spec send_file(term(), term(), term(), term(), term(), term()) :: no_return()
  def send_file(_state, _status, _headers, _path, _offset, _length), do: unsupported!()

  @impl true
  @spec send_chunked(term(), term(), term()) :: no_return()
  def send_chunked(_state, _status, _headers), do: unsupported!()

  @impl true
  def chunk(_state, _body), do: {:error, :not_supported}

  @impl true
  def inform(_state, _status, _headers), do: {:error, :not_supported}

  @impl true
  def upgrade(_state, _protocol, _opts), do: {:error, :not_supported}

  @impl true
  def get_peer_data(_state), do: %{address: {127, 0, 0, 1}, port: 0, ssl_cert: nil}

  @impl true
  def get_http_protocol(_state), do: :"HTTP/1.1"

  defp unsupported!, do: raise(ArgumentError, "MCP only adapts JSON responses")
end
