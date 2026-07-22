defmodule Codebattle.InviteTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Invite

  test "manages invite lifecycle and accepts a task-specific challenge" do
    creator = insert(:user, subscription_type: :premium)
    recipient = insert(:user, subscription_type: :premium)
    task = insert(:task)

    assert {:error, invalid} = Invite.create_invite(%{state: nil})
    refute invalid.valid?

    assert {:ok, invite} =
             Invite.create_invite(%{
               creator_id: creator.id,
               recipient_id: recipient.id,
               task_id: task.id,
               game_params: %{level: "easy", type: "public", timeout_seconds: 120}
             })

    assert invite.creator.id == creator.id
    assert invite.recipient.id == recipient.id
    assert Invite.get_invite!(invite.id).id == invite.id
    assert Enum.map(Invite.list_invites(), & &1.id) == [invite.id]
    assert Enum.map(Invite.list_active_invites(creator.id), & &1.id) == [invite.id]
    assert Enum.map(Invite.list_all_active_invites(), & &1.id) == [invite.id]
    assert Invite.has_pending_invites?(creator.id, recipient.id)
    assert Invite.change_invite(invite, %{state: "changed"}).changes.state == "changed"

    assert {:ok, competing_invite} =
             Invite.create_invite(%{creator_id: recipient.id, recipient_id: creator.id})

    assert_raise RuntimeError, "Not authorized!", fn ->
      Invite.accept_invite(%{id: invite.id, recipient_id: creator.id})
    end

    assert {:ok, %{invite: accepted, dropped_invites: dropped}} =
             Invite.accept_invite(%{id: invite.id, recipient_id: recipient.id})

    assert accepted.state == "accepted"
    assert is_integer(accepted.game_id)
    assert Enum.any?(dropped, &(&1.id == competing_invite.id))

    assert {:ok, cancelable} =
             Invite.create_invite(%{creator_id: creator.id, recipient_id: recipient.id})

    assert_raise RuntimeError, "Not authorized!", fn ->
      Invite.cancel_invite(%{id: cancelable.id, user_id: -1})
    end

    assert {:ok, canceled} = Invite.cancel_invite(%{id: cancelable.id, user_id: creator.id})
    assert canceled.state == "canceled"
    assert {:ok, deleted} = Invite.delete_invite(canceled)
    assert deleted.id == canceled.id
  end

  test "returns the game changeset when challenge configuration is invalid" do
    creator = insert(:user, subscription_type: :premium)
    recipient = insert(:user, subscription_type: :premium)

    assert {:ok, invite} =
             Invite.create_invite(%{
               creator_id: creator.id,
               recipient_id: recipient.id,
               game_params: %{type: "unsupported"}
             })

    assert {:error, %Ecto.Changeset{} = changeset} =
             Invite.accept_invite(%{id: invite.id, recipient_id: recipient.id})

    refute changeset.valid?
  end
end
