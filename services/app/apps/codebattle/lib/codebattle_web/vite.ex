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
    paths =
      case manifest()[entry] do
        %{"css" => css_list} ->
          # CSS imported by this JS entry
          Enum.map(css_list, &("/assets/" <> &1))

        _ ->
          # No CSS imported by this entry, look for standalone CSS
          # Try to find a CSS file that matches the JS entry name
          # For "app.js", look for any entry that outputs "app.css"
          css_filename = String.replace(entry, ~r/\.js$/, ".css")

          # Search through all manifest entries to find one with matching output
          case Enum.find(manifest(), fn {_k, v} ->
                 is_map(v) && Map.get(v, "file") == css_filename
               end) do
            {_key, %{"file" => file}} -> ["/assets/" <> file]
            _ -> []
          end
      end

    # Apply digest hash to all paths in production
    Enum.map(paths, &apply_digest/1)
  end
end
