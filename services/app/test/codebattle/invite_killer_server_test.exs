defmodule Codebattle.InvitesKillerServerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.InvitesKillerServer
  @timeout Application.compile_env(:codebattle, Codebattle.Invite)[:timeout]

  test "starts server" do
    assert InvitesKillerServer.start_link()
  end

  test "invite expires when it's time" do
    invite_first = insert(:invite)
    invite_second = insert(:invite)
    assert invite_first.state == "pending"
    assert invite_second.state == "pending"
    assert InvitesKillerServer.start_link()
    :timer.sleep(@timeout + 2000)
    expired_first = Codebattle.Invite.get_invite!(invite_first.id)
    expired_second = Codebattle.Invite.get_invite!(invite_second.id)
    assert expired_first.state == "expired"
    assert expired_second.state == "expired"
  end
end
