defmodule CodebattleWeb.SupportTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.SupportTournament

  plug(:put_view, CodebattleWeb.SupportTournamentView)
  plug(:ensure_feature_enabled)
  plug(:authorize)

  def index(conn, params) do
    render(conn, "index.html",
      result: nil,
      user_id: params["user_id"] || "",
      error: nil
    )
  end

  def search(conn, %{"user_id" => user_id}) do
    case SupportTournament.lookup_user(user_id) do
      {:ok, result} ->
        render(conn, "index.html",
          result: result,
          user_id: user_id,
          error: nil
        )

      {:error, reason} ->
        render(conn, "index.html",
          result: nil,
          user_id: user_id,
          error: reason
        )
    end
  end

  def search(conn, _params) do
    render(conn, "index.html",
      result: nil,
      user_id: "",
      error: "Enter a user id"
    )
  end

  defp ensure_feature_enabled(conn, _opts) do
    if FunWithFlags.enabled?(:support_tournament_page) do
      conn
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html")
      |> halt()
    end
  end

  defp authorize(conn, _opts) do
    expected_token = Application.get_env(:codebattle, :support_tournament_auth_token)
    provided_token = token_from_conn(conn)

    if valid_token?(provided_token, expected_token) do
      put_session(conn, :support_tournament_auth_token, provided_token)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html")
      |> halt()
    end
  end

  defp token_from_conn(conn) do
    conn.params["auth_token"] ||
      List.first(get_req_header(conn, "x-auth-key")) ||
      get_session(conn, :support_tournament_auth_token)
  end

  defp valid_token?(token, expected_token)
       when is_binary(token) and is_binary(expected_token) and byte_size(token) > 0 and byte_size(expected_token) > 0 do
    byte_size(token) == byte_size(expected_token) && Plug.Crypto.secure_compare(token, expected_token)
  end

  defp valid_token?(_token, _expected_token), do: false
end
