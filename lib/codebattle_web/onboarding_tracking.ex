defmodule CodebattleWeb.OnboardingTracking do
  @moduledoc false
  import Plug.Conn

  alias Codebattle.Onboarding

  def landing(conn) do
    track(conn, fn -> Onboarding.record_landing(conn.assigns.current_user) end)
  end

  def setup(conn) do
    track(conn, fn -> Onboarding.record_setup(get_session(conn, :guest_id)) end)
  end

  def practice(conn, game, lang) do
    track(conn, fn -> Onboarding.record_practice(get_session(conn, :guest_id), game, lang) end)
  end

  def sign_in(conn) do
    track(conn, fn -> Onboarding.record_sign_in(get_session(conn, :guest_id)) end)
  end

  defp track(conn, record) do
    if "1" in get_req_header(conn, "dnt") or "1" in get_req_header(conn, "sec-gpc") do
      Onboarding.forget(get_session(conn, :guest_id))
    else
      record.()
    end

    conn
  end
end
