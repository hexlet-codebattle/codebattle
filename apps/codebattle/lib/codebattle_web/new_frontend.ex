defmodule CodebattleWeb.NewFrontend do
  @moduledoc """
  Opt-in switch to the new Mantine frontend (apps/codebattle/frontend).

  Enabled per user with the `:new_frontend` FunWithFlags flag, e.g. in IEx:

      FunWithFlags.enable(:new_frontend, for_actor: Codebattle.User.get!(id))

  Only pages ported to the new app call `maybe_put_layout/1`; every other page
  keeps the legacy layout, so links between them are ordinary page loads.
  """

  import Phoenix.Controller, only: [put_layout: 2]

  alias CodebattleWeb.LayoutView

  @flag :new_frontend
  @dev_server_port 8081
  @manifest_path "static/assets/v2/manifest.json"
  @entry "src/main.tsx"

  @spec enabled?(Plug.Conn.t()) :: boolean()
  def enabled?(%Plug.Conn{assigns: %{current_user: %{is_guest: false} = user}}) do
    FunWithFlags.enabled?(@flag, for: user)
  end

  def enabled?(_conn), do: false

  @spec maybe_put_layout(Plug.Conn.t()) :: Plug.Conn.t()
  def maybe_put_layout(conn) do
    if enabled?(conn) do
      put_layout(conn, html: {LayoutView, :v2})
    else
      conn
    end
  end

  def dev_server_url do
    port = System.get_env("CODEBATTLE_FRONTEND_PORT", Integer.to_string(@dev_server_port))
    "http://localhost:#{port}"
  end

  def entry_path, do: @entry

  @doc "Production script and stylesheet paths for the entry, from the Vite manifest."
  @spec assets() :: %{js: String.t() | nil, css: [String.t()]}
  def assets do
    case manifest() do
      %{@entry => %{"file" => file} = entry} ->
        %{js: static_path(file), css: Enum.map(Map.get(entry, "css", []), &static_path/1)}

      _ ->
        %{js: nil, css: []}
    end
  end

  defp static_path(file), do: CodebattleWeb.Endpoint.static_path("/assets/v2/" <> file)

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
