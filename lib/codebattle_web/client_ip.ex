defmodule CodebattleWeb.ClientIP do
  @moduledoc """
  Resolves client addresses for anonymous rate limits. Forwarded addresses are
  considered only behind configured trusted proxies, walking right to left so
  a client cannot choose its identity by prepending X-Forwarded-For values.
  """

  def from_conn(conn) do
    peer = normalize(conn.remote_ip)
    proxies = Application.get_env(:codebattle, :anonymous_rate_limit_trusted_proxies, [])

    conn
    |> Plug.Conn.get_req_header("x-forwarded-for")
    |> Enum.join(",")
    |> String.split(",", trim: true)
    |> Enum.reverse()
    |> Enum.reduce_while(peer, &resolve_hop(&1, &2, proxies))
  end

  defp resolve_hop(forwarded, current, proxies) do
    if Enum.any?(proxies, &in_network?(current, &1)) do
      case forwarded |> String.trim() |> String.to_charlist() |> :inet.parse_strict_address() do
        {:ok, ip} -> {:cont, normalize(ip)}
        {:error, _reason} -> {:halt, current}
      end
    else
      {:halt, current}
    end
  end

  defp in_network?(ip, {network, bits}) when tuple_size(ip) == tuple_size(network) do
    <<prefix::bitstring-size(^bits), _rest::bitstring>> = address_binary(ip)
    <<network_prefix::bitstring-size(^bits), _rest::bitstring>> = address_binary(network)
    prefix == network_prefix
  end

  defp in_network?(_ip, _network), do: false

  defp address_binary({a, b, c, d}), do: <<a, b, c, d>>

  defp address_binary({a, b, c, d, e, f, g, h}), do: <<a::16, b::16, c::16, d::16, e::16, f::16, g::16, h::16>>

  defp normalize({0, 0, 0, 0, 0, 0xFFFF, ab, cd}), do: {div(ab, 256), rem(ab, 256), div(cd, 256), rem(cd, 256)}
  defp normalize(ip), do: ip
end
