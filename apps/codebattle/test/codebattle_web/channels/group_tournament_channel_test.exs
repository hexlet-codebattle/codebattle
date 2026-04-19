defmodule CodebattleWeb.GroupTournamentChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament
  alias CodebattleWeb.Endpoint
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
    group_tournament = insert_group_tournament!()
    topic = "group_tournament:#{group_tournament.id}"

    # Grant the user access to the tournament
    Codebattle.UserGroupTournament.Context.get_or_create(user, group_tournament)

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})

    {:ok, %{socket: socket, topic: topic, user: user}}
  end

  test "join returns a ready invite and returns it", %{socket: socket, topic: topic, user: user} do
    {:ok, response, _socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    assert %{invite: %{state: "invited", invite_link: invite_link}} = response
    assert String.starts_with?(invite_link, "https://fake-platform.test/invite/")

    tournament_id = topic |> String.split(":") |> List.last() |> String.to_integer()
    invite = InviteContext.get_invite(user.id, tournament_id)

    assert invite.state == "invited"
    assert String.starts_with?(invite.operation_id, "fake-op-")
    assert String.starts_with?(invite.invite_link, "https://fake-platform.test/invite/")
  end

  test "join rejects an invalid tournament id", %{socket: socket} do
    assert {:error, %{reason: "invalid_tournament_id"}} =
             subscribe_and_join(socket, GroupTournamentChannel, "group_tournament:undefined")
  end

  test "pushes run updates broadcast on the tournament topic", %{socket: socket, topic: topic} do
    {:ok, _response, _socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    Endpoint.broadcast!(topic, "group_tournament:run_updated", %{
      group_tournament: %{id: 1, state: "active", meta: %{"last_run_status" => "success"}},
      run: %{id: 42, status: "success", player_ids: [1, 2], result: %{"winner_id" => 1}}
    })

    assert_push("group_tournament:run_updated", %{
      group_tournament: %{id: 1, state: "active", meta: %{"last_run_status" => "success"}},
      run: %{id: 42, status: "success", player_ids: [1, 2], result: %{"winner_id" => 1}}
    })
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
