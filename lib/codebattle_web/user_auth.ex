defmodule CodebattleWeb.UserAuth do
  @moduledoc false

  import Plug.Conn

  alias Codebattle.UserSession

  @session_token_key :user_session_token

  def log_in_user(conn, user) do
    {:ok, _session, token} = UserSession.create(user, session_metadata(conn))

    conn
    |> configure_session(renew: true)
    |> delete_session(:user_id)
    |> delete_session(:session_version)
    |> put_session(@session_token_key, token)
  end

  def log_out_user(conn) do
    conn
    |> get_session(@session_token_key)
    |> UserSession.revoke_by_token()

    conn
    |> clear_session()
    |> configure_session(drop: true)
  end

  def put_session_token(conn, token) do
    conn
    |> configure_session(renew: true)
    |> delete_session(:user_id)
    |> delete_session(:session_version)
    |> put_session(@session_token_key, token)
  end

  def session_token(conn), do: get_session(conn, @session_token_key)

  def session_metadata(conn) do
    [
      user_agent:
        conn
        |> get_req_header("user-agent")
        |> List.first()
        |> truncate(512),
      ip: format_ip(conn.remote_ip)
    ]
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
    |> Map.new()
  end

  defp format_ip(ip) do
    ip
    |> :inet.ntoa()
    |> to_string()
  rescue
    ArgumentError -> nil
  end

  defp truncate(nil, _max_length), do: nil
  defp truncate(value, max_length), do: String.slice(value, 0, max_length)
end
