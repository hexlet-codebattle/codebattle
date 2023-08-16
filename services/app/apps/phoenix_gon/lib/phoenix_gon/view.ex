defmodule PhoenixGon.View do
  import PhoenixGon.Utils
  import Phoenix.HTML
  import Phoenix.HTML.Tag

  @moduledoc """
  Adds templates helpers for rendering and adding javascript code to browser.
  """

  @doc """
  Returns javascript code what adds phoenix variables to javascript and browser.
  """
  @spec render_gon_script(Plug.Conn.t()) :: any()
  def render_gon_script(conn) do
    content_tag(:script, type: "text/javascript") do
      raw(script(conn))
    end
  end

  @spec escape_assets(Plug.Conn.t()) :: String.t()
  def escape_assets(conn) do
    conn
    |> assets
    |> resolve_assets_case(conn)
    |> json_library().encode!
    |> javascript_escape
  end

  @doc false
  @spec script(Plug.Conn.t()) :: String.t()
  defp script(conn) do
    """
    var #{namespace(conn)} = (function(window) {
      var phoenixEnv = '#{settings(conn)[:env]}';
      var phoenixAssets = JSON.parse("#{escape_assets(conn)}");

      return {
        getEnv: function() {
          return phoenixEnv;
        },
        isDev: function() {
          return phoenixEnv === 'dev';
        },
        isProd: function() {
          return phoenixEnv === 'prod';
        },
        isCustomEnv: function(customEnv) {
          return phoenixEnv === customEnv;
        },
        assets: function() {
          return phoenixAssets;
        },
        getAsset: function(property) {
          return phoenixAssets[property];
        }
      };
    })(window);
    """
  end

  @doc false
  @spec resolve_assets_case(Map.t(), Plug.Conn.t()) :: Map.t()
  defp resolve_assets_case(assets, conn) do
    if settings(conn)[:camel_case],
      do: to_camel_case(assets),
      else: assets
  end

  @doc false
  @spec to_camel_case(Map.t()) :: Map.t()
  defp to_camel_case(map) when is_map(map) do
    for {key, value} <- map, into: %{} do
      new_key =
        key
        |> Atom.to_string()
        |> Recase.to_camel()
        |> String.to_atom()

      {new_key, to_camel_case(value)}
    end
  end

  defp to_camel_case(value),
    do: value

  defp json_library do
    Application.get_env(:phoenix_gon, :json_library, Jason)
  end
end
