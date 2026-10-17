defmodule CodebattleWeb.Live.Admin.OnboardingFunnelTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Onboarding
  alias Codebattle.Onboarding.Session

  test "admin dashboard shows cohort conversion and supports changing the window", %{conn: conn} do
    import Ecto.Query

    admin = insert(:admin)
    guest = User.build_guest(User.generate_guest_id())
    Onboarding.record_landing(guest)
    Onboarding.record_setup(guest.id)

    old = User.build_guest(User.generate_guest_id())
    Onboarding.record_landing(old)
    old_date = DateTime.add(DateTime.utc_now(), -15, :day)
    Repo.update_all(from(s in Session, where: s.guest_id == ^old.id), set: [landed_at: old_date])

    {:ok, view, html} = live(log_in_user(conn, admin), "/admin")
    assert html =~ "Onboarding funnel"
    assert html =~ "Includes existing accounts"
    assert view |> element("#onboarding-step-setup") |> render() =~ "50.0%"

    view |> form("#onboarding-funnel form") |> render_change(%{"days" => "7"})
    assert view |> element("#onboarding-step-setup") |> render() =~ "100.0%"
    assert view |> element("#onboarding-funnel button", "Refresh") |> render_click() =~ "Onboarding funnel"
  end

  test "guests and ordinary accounts cannot read onboarding results", %{conn: conn} do
    assert conn |> get("/admin") |> redirected_to() == "/"
    assert conn |> log_in_user(insert(:user)) |> get("/admin") |> redirected_to() == "/"
  end
end
