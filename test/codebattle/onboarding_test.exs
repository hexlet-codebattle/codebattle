defmodule Codebattle.OnboardingTest do
  use Codebattle.DataCase

  alias Codebattle.Game.Player
  alias Codebattle.Onboarding
  alias Codebattle.Onboarding.Session
  alias Codebattle.Task

  setup do
    guest = User.build_guest(User.generate_guest_id())
    %{guest: guest}
  end

  test "milestones are deduplicated and bots and spectators cannot advance them", %{guest: guest} do
    Onboarding.record_landing(guest)
    Onboarding.record_landing(guest)
    Onboarding.record_setup(guest.id)
    game = %{insert(:game) | mode: "training", players: [Player.build(guest)]}
    Onboarding.record_practice(guest.id, game, "python")
    first = Repo.get_by!(Session, guest_id: guest.id)

    Onboarding.record_practice(guest.id, game, "js")
    Onboarding.record_check(game, %{guest | is_bot: true}, %{status: "ok"})
    Onboarding.record_check(game, User.build_guest(User.generate_guest_id()), %{status: "ok"})
    assert is_nil(Repo.get_by!(Session, guest_id: guest.id).first_check_at)

    Onboarding.record_check(game, guest, %{status: "failure"})
    checked = Repo.get_by!(Session, guest_id: guest.id)
    assert checked.first_check_at
    refute checked.solved_at

    Onboarding.record_check(game, guest, %{status: "ok"})
    Onboarding.record_check(game, guest, %{status: "ok"})
    row = Repo.get_by!(Session, guest_id: guest.id)
    assert row.first_check_at == checked.first_check_at
    assert row.practice_started_at == first.practice_started_at
    assert row.first_lang == "python"
    assert row.solved_at
    assert Repo.aggregate(Session, :count) == 1
  end

  test "another practice counts only after solving the first one", %{guest: guest} do
    Onboarding.record_landing(guest)
    Onboarding.record_setup(guest.id)
    game = %{insert(:game) | mode: "training", players: [Player.build(guest)]}
    another = insert(:game)
    Onboarding.record_practice(guest.id, game, "js")
    Onboarding.record_practice(guest.id, another, "js")
    refute Repo.get_by!(Session, guest_id: guest.id).next_practice_at

    Onboarding.record_check(game, guest, %{status: "ok"})
    Onboarding.record_practice(guest.id, game, "js")
    refute Repo.get_by!(Session, guest_id: guest.id).next_practice_at
    Onboarding.record_practice(guest.id, another, "python")
    assert Repo.get_by!(Session, guest_id: guest.id).next_practice_at
  end

  test "reports use first-landing cohorts, independent sign-ins, and safe empty rates", %{guest: guest} do
    assert Onboarding.report().total == 0
    assert Enum.all?(Onboarding.report().steps, &(&1.conversion == 0.0))

    Onboarding.record_landing(guest)
    Onboarding.record_setup(guest.id)
    game = %{insert(:game) | mode: "training", players: [Player.build(guest)]}
    Onboarding.record_practice(guest.id, game, "python")
    Onboarding.record_check(game, guest, %{status: "ok"})
    Onboarding.record_sign_in(guest.id)
    Onboarding.record_sign_in(guest.id)
    Onboarding.record_landing(User.build_guest(User.generate_guest_id()))

    old = User.build_guest(User.generate_guest_id())
    Onboarding.record_landing(old)
    old_date = DateTime.add(DateTime.utc_now(), -40, :day)
    Repo.update_all(from(s in Session, where: s.guest_id == ^old.id), set: [landed_at: old_date])

    report = Onboarding.report(30)
    assert report.total == 2
    assert report.signed_in == 1
    assert [%{lang: "python", started: 1, solved: 1}] = report.languages
    assert Enum.find(report.steps, &(&1.key == :started)).conversion == 50.0
    assert Enum.find(report.steps, &(&1.key == :checked)).from_previous == 100.0
    assert Onboarding.report(90).total == 3
  end

  test "direct training and signed-in visitors do not create landing sessions", %{guest: guest} do
    Onboarding.record_landing(insert(:user))
    Onboarding.record_landing(User.build_guest())
    Onboarding.record_setup(guest.id)
    Onboarding.record_practice(guest.id, insert(:game), "js")
    Onboarding.record_sign_in(nil)
    assert Onboarding.report().total == 0
  end

  test "onboarding tasks prefer elementary public training and avoid repetition" do
    fallback = insert(:task, level: "elementary", tags: ["math"])
    assert Task.get_onboarding_task().id == fallback.id
    insert(:task, level: "elementary", tags: ["training"], visibility: "hidden")
    insert(:task, level: "elementary", tags: ["training"], state: "disabled")
    easy = insert(:task, level: "easy", tags: ["training"])
    elementary = insert(:task, level: "elementary", tags: ["training"])
    assert Task.get_onboarding_task().id == elementary.id
    assert Task.get_onboarding_task(elementary.id).id == easy.id
    Repo.delete!(easy)
    Repo.delete!(fallback)
    assert Task.get_onboarding_task(elementary.id).id == elementary.id
  end

  test "expires only records older than 90 days", %{guest: guest} do
    Onboarding.record_landing(guest)
    old = User.build_guest(User.generate_guest_id())
    Onboarding.record_landing(old)
    old_date = DateTime.add(DateTime.utc_now(), -91, :day)
    Repo.update_all(from(s in Session, where: s.guest_id == ^old.id), set: [landed_at: old_date])

    assert :ok = Codebattle.Workers.OnboardingPurgeWorker.perform(%{})
    assert Repo.get_by(Session, guest_id: guest.id)
    refute Repo.get_by(Session, guest_id: old.id)
  end
end
