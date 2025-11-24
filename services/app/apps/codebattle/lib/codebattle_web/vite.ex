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

  def asset_path(entry) do
    case manifest()[entry] do
      %{"file" => file} -> "/assets/" <> file
      _ -> "/assets/" <> entry
    end
  end

  def css_paths(entry) do
    case manifest()[entry] do
      %{"css" => css_list} -> Enum.map(css_list, &("/assets/" <> &1))
      _ -> []
    end
  end
end
