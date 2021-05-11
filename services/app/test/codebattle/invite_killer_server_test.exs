defmodule Codebattle.InvitesKillerServerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.InvitesKillerServer

  test "invite expires when it's time" do
    invite_first = insert(:invite)
    invite_second = insert(:invite)

    assert invite_first.state == "pending"
    assert invite_second.state == "pending"

    :ok = InvitesKillerServer.work()

    :timer.sleep(300)

    expired_first = Codebattle.Invite.get_invite!(invite_first.id)
    expired_second = Codebattle.Invite.get_invite!(invite_second.id)
    assert expired_first.state == "expired"
    assert expired_second.state == "expired"
  end
end
