defmodule CodebattleWeb.Frontend do
  @moduledoc """
  The React + Mantine frontend (frontend): Inertia pages render in
  the v2 layout, which loads the Vite dev server in dev and the built bundle
  (priv/static/assets/v2) in prod.
  """

  import Phoenix.Controller, only: [put_layout: 2]

  alias CodebattleWeb.LayoutView

  @dev_server_port 8081
  @manifest_path "static/assets/v2/manifest.json"
  @entry "src/main.tsx"
  @admin_entry "src/admin/main.ts"

  # The new frontend is the only frontend now (guests included); the legacy assets
  # are being removed. Kept as a function until every caller's legacy branch is gone.
  @doc "Renders the page inside the frontend's layout (layout/v2.html.heex)."
  @spec put_layout(Plug.Conn.t()) :: Plug.Conn.t()
  def put_layout(conn), do: put_layout(conn, html: {LayoutView, :v2})

  def dev_server_url do
    port = System.get_env("CODEBATTLE_FRONTEND_PORT", Integer.to_string(@dev_server_port))
    "http://localhost:#{port}"
  end

  def entry_path, do: @entry

  @doc "The admin pages' entry (LiveView socket, phoenix_html, admin styles)."
  def admin_entry_path, do: @admin_entry

  @doc "Production script and stylesheet paths for an entry (the app by default), from the Vite manifest."
  @spec assets(String.t()) :: %{js: String.t() | nil, css: [String.t()]}
  def assets(entry \\ @entry) do
    case manifest() do
      %{^entry => %{"file" => file} = chunk} ->
        %{js: static_path(file), css: Enum.map(Map.get(chunk, "css", []), &static_path/1)}

      _ ->
        %{js: nil, css: []}
    end
  end

  # Vite already fingerprints its files. Not Endpoint.static_path: the phx.digest name
  # (main-<vite>-<md5>.js) differs from the "./main-<vite>.js" that lazy chunks import,
  # so the browser would run the entry twice (two React roots, two sockets, two editors).
  defp static_path(file), do: "/assets/v2/" <> file

  # The manifest only changes on deploy; cache it outside dev.
  defp manifest do
    if CodebattleWeb.Vite.dev?() do
      read_manifest()
    else
      case :persistent_term.get({__MODULE__, :manifest}, nil) do
        nil ->
          manifest = read_manifest()
          :persistent_term.put({__MODULE__, :manifest}, manifest)
          manifest

        manifest ->
          manifest
      end
    end
  end

  defp read_manifest do
    with {:ok, json} <- :codebattle |> :code.priv_dir() |> Path.join(@manifest_path) |> File.read(),
         {:ok, data} <- Jason.decode(json) do
      data
    else
      _ -> %{}
    end
  end
end
