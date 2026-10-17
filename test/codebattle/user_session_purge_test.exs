defmodule Codebattle.UserSessionPurgeTest do
  use Codebattle.DataCase, async: true
  use Oban.Testing, repo: Codebattle.Repo

  alias Codebattle.Repo
  alias Codebattle.UserSession
  alias Codebattle.Workers.UserSessionPurgeWorker

  test "deletes sessions that ended more than the retention period ago" do
    user = insert(:user)
    now = DateTime.utc_now(:second)
    long_ago = DateTime.add(now, -(UserSession.stale_retention_days() + 1), :day)
    recently = DateTime.add(now, -1, :day)

    {:ok, active, _} = UserSession.create(user)
    {:ok, recently_revoked, _} = UserSession.create(user)
    {:ok, old_revoked, _} = UserSession.create(user)
    {:ok, old_expired, _} = UserSession.create(user)

    recently_revoked |> Ecto.Changeset.change(revoked_at: recently) |> Repo.update!()
    old_revoked |> Ecto.Changeset.change(revoked_at: long_ago) |> Repo.update!()
    old_expired |> Ecto.Changeset.change(expires_at: long_ago) |> Repo.update!()

    assert :ok = perform_job(UserSessionPurgeWorker, %{})

    assert Repo.get(UserSession, active.id)
    assert Repo.get(UserSession, recently_revoked.id)
    refute Repo.get(UserSession, old_revoked.id)
    refute Repo.get(UserSession, old_expired.id)
  end
end
