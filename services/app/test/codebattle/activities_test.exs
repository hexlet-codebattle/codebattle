defmodule Codebattle.ActivitiesTest do
  use Codebattle.DataCase

  alias Codebattle.Activities

  describe "invites" do
    alias Codebattle.Activities.Invite

    @valid_attrs %{state: "some state"}
    @update_attrs %{state: "some updated state"}
    @invalid_attrs %{state: nil}

    def invite_fixture(attrs \\ %{}) do
      {:ok, invite} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Activities.create_invite()

      invite
    end

    test "list_invites/0 returns all invites" do
      invite = invite_fixture()
      assert Activities.list_invites() == [invite]
    end

    test "get_invite!/1 returns the invite with given id" do
      invite = invite_fixture()
      assert Activities.get_invite!(invite.id) == invite
    end

    test "create_invite/1 with valid data creates a invite" do
      assert {:ok, %Invite{} = invite} = Activities.create_invite(@valid_attrs)
      assert invite.state == "some state"
    end

    test "create_invite/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Activities.create_invite(@invalid_attrs)
    end

    test "update_invite/2 with valid data updates the invite" do
      invite = invite_fixture()
      assert {:ok, %Invite{} = invite} = Activities.update_invite(invite, @update_attrs)
      assert invite.state == "some updated state"
    end

    test "update_invite/2 with invalid data returns error changeset" do
      invite = invite_fixture()
      assert {:error, %Ecto.Changeset{}} = Activities.update_invite(invite, @invalid_attrs)
      assert invite == Activities.get_invite!(invite.id)
    end

    test "delete_invite/1 deletes the invite" do
      invite = invite_fixture()
      assert {:ok, %Invite{}} = Activities.delete_invite(invite)
      assert_raise Ecto.NoResultsError, fn -> Activities.get_invite!(invite.id) end
    end

    test "change_invite/1 returns a invite changeset" do
      invite = invite_fixture()
      assert %Ecto.Changeset{} = Activities.change_invite(invite)
    end
  end
end
