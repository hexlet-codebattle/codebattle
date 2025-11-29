defmodule CodebattleWeb.Vite do
  @moduledoc false

  @manifest_path Path.join(:code.priv_dir(:codebattle), "static/assets/manifest.json")

  def dev? do
    Application.get_env(:codebattle, :env) == :dev
  end

  def manifest do
    with {:ok, json} <- File.read(@manifest_path),
         {:ok, data} <- Jason.decode(json) do
      data
    else
      _ -> %{}
    end
  end

  # Apply Phoenix digest hash to a path in production
  defp apply_digest(path) do
    if dev?() do
      path
    else
      # Use Phoenix's static path to get the digested version
      # Routes.static_path uses the endpoint's static_path/1
      CodebattleWeb.Endpoint.static_path(path)
    end
  end

  def asset_path(entry) do
    path =
      case manifest()[entry] do
        %{"file" => file} -> "/assets/" <> file
        _ -> "/assets/" <> entry
      end

    apply_digest(path)
  end

  def css_paths(entry) do
    m = manifest()

    paths =
      case m[entry] do
        %{"css" => css_list} ->
          Enum.map(css_list, &("/assets/" <> &1))

        _ ->
          find_standalone_css(m, entry)
      end

    Enum.map(paths, &apply_digest/1)
  end

  defp find_standalone_css(manifest_map, entry) do
    css_filename = String.replace(entry, ~r/\.js$/, ".css")

    case Enum.find(manifest_map, fn {_k, v} ->
           is_map(v) && Map.get(v, "file") == css_filename
         end) do
      {_key, %{"file" => file}} -> ["/assets/" <> file]
      _ -> []
    end
  end
end
