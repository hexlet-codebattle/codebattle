defmodule CodebattleWeb.GroupTournamentChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament
  alias CodebattleWeb.GroupTournamentChannel
  alias CodebattleWeb.UserSocket

  setup do
    Req.Test.stub(Codebattle.Auth, fn req ->
      %{request_path: "/orgs/test-org/invites", method: "POST", host: "ext.test"} = req

      Req.Test.json(req, %{
        "operation_id" => "op-123",
        "status_url" => "https://ext.test/operations/create-invites/id:op-123"
      })
    end)

    user = insert(:user, name: "invite-user")
    topic = "group_tournament:#{insert_group_tournament!().id}"

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})

    {:ok, %{socket: socket, topic: topic, user: user}}
  end

  test "join sends a pending invite and returns it", %{socket: socket, topic: topic, user: user} do
    {:ok, response, _socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    assert %{invite: %{state: "creating", response: %{"operation_id" => "op-123"}}} = response

    tournament_id = topic |> String.split(":") |> List.last() |> String.to_integer()
    invite = InviteContext.get_invite(user.id, tournament_id)

    assert invite.state == "creating"
    assert invite.operation_id == "op-123"
  end

  test "join rejects an invalid tournament id", %{socket: socket} do
    assert {:error, %{reason: "invalid_tournament_id"}} =
             subscribe_and_join(socket, GroupTournamentChannel, "group_tournament:undefined")
  end

  defp insert_group_tournament! do
    creator = insert(:user)
    group_task = insert(:group_task)

    %GroupTournament{}
    |> GroupTournament.changeset(%{
      creator_id: creator.id,
      group_task_id: group_task.id,
      name: "Group Tournament",
      slug: "group-tournament-#{System.unique_integer([:positive])}",
      description: "Group tournament description",
      starts_at: DateTime.add(DateTime.utc_now(), 3600, :second),
      rounds_count: 1,
      round_timeout_seconds: 60,
      require_invitation: true
    })
    |> Repo.insert!()
  end
end
