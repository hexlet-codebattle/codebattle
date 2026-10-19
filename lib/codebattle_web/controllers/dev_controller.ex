defmodule CodebattleWeb.DevController do
  use CodebattleWeb, :controller

  alias CodebattleWeb.Frontend

  def show(conn, _params) do
    commit = present(Application.get_env(:codebattle, :app_version))

    conn
    |> put_meta_tags(%{title: "Developer info · Codebattle"})
    |> assign(:page_title, "Developer info")
    |> put_resp_header("cache-control", "no-store")
    |> Frontend.put_layout()
    |> render_inertia("Dev", %{
      "commit" => commit,
      "commit_url" => commit_url(commit),
      "deployed_at" => present(Application.get_env(:codebattle, :deployed_at)),
      "deployment_time_provided" => present(System.get_env("DEPLOYED_AT")) != nil,
      "release_version" => to_string(Application.spec(:codebattle, :vsn)),
      "elixir_version" => System.version(),
      "otp_version" => System.otp_release()
    })
  end

  defp present(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      value -> value
    end
  end

  defp present(_value), do: nil

  defp commit_url(nil), do: nil

  defp commit_url(commit) do
    if Regex.match?(~r/\A[0-9a-f]{40}\z/i, commit) do
      "https://github.com/hexlet-codebattle/codebattle/commit/#{commit}"
    end
  end
end
