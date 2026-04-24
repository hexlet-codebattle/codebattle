defmodule CodebattleWeb.GroupTournamentChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.PubSub
  alias Codebattle.UserGroupTournament.Context
  alias CodebattleWeb.GroupTournamentChannel
  alias CodebattleWeb.UserSocket

  setup do
    Application.put_env(:codebattle, :group_task_runner_http_client, CodebattleWeb.FakeGroupTaskRunnerHttpClient)

    on_exit(fn ->
      Application.delete_env(:codebattle, :group_task_runner_http_client)
      Application.delete_env(:codebattle, :group_task_runner_response)
      Process.delete(:group_task_runner_last_request)
      Process.delete(:group_task_runner_response)
    end)

    Req.Test.stub(Codebattle.Auth, fn req ->
      %{request_path: "/orgs/test-org/invites", method: "POST", host: "ext.test"} = req

      Req.Test.json(req, %{
        "operation_id" => "op-123",
        "status_url" => "https://ext.test/operations/create-invites/id:op-123"
      })
    end)

    user = insert(:user, name: "invite-user", subscription_type: :moderator)
    group_tournament = insert_group_tournament!()
    topic = "group_tournament:#{group_tournament.id}"

    # Grant the user access to the tournament
    Context.get_or_create(user, group_tournament)

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

    tournament_id = topic |> String.split(":") |> List.last() |> String.to_integer()

    PubSub.broadcast("group_tournament:run_updated", %{
      group_tournament_id: tournament_id,
      user_id: 17,
      run_id: 42
    })

    assert_push("group_tournament:run_updated", %{group_tournament_id: ^tournament_id, user_id: 17, run_id: 42})
  end

  test "broadcasts a run update after creating a solution through the API flow", %{
    socket: socket,
    user: user
  } do
    group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: user.id,
        group_task_id: group_task.id,
        name: "Broadcast Tournament",
        slug: "broadcast-tournament",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })
      |> Repo.insert!()

    tournament_topic = "group_tournament:#{group_tournament.id}"

    {:ok, _player} =
      GroupTournamentContext.create_or_update_player(group_tournament, user.id, %{
        lang: "python",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    {:ok, token} = GroupTournamentContext.create_or_rotate_token(group_tournament, user.id)

    Application.put_env(
      :codebattle,
      :group_task_runner_response,
      {:ok, %Req.Response{status: 200, body: %{"winner_id" => user.id}}}
    )

    {:ok, _response, socket} = subscribe_and_join(socket, GroupTournamentChannel, tournament_topic)

    {:ok, solution} =
      GroupTournamentContext.create_solution_from_token_and_run(token.token, %{
        "solution" => Base.encode64("def solution():\n    return 7\n"),
        "lang" => "Python"
      })

    [run] = GroupTournamentContext.list_runs(group_tournament, limit: 1)
    tournament_id = group_tournament.id
    group_task_id = group_task.id
    run_id = run.id
    user_id = user.id

    assert_push("group_tournament:run_updated", %{
      group_tournament_id: ^tournament_id,
      user_id: ^user_id,
      run_id: ^run_id
    })

    ref = push(socket, "group_tournament:run:request", %{"run_id" => run_id})

    assert_reply(
      ref,
      :ok,
      %{
        run: %{
          id: ^run_id,
          group_tournament_id: ^tournament_id,
          group_task_id: ^group_task_id,
          user_id: ^user_id,
          status: "success",
          result: %{"winner_id" => ^user_id},
          solution: %{
            id: _solution_id,
            user_id: ^user_id,
            lang: "python",
            solution: _
          }
        }
      }
    )

    assert run.status == "success"
    assert run.result == %{"winner_id" => user.id}
    assert solution.user_id == user.id
  end

  test "rejects run details request from non owner and non admin user", %{socket: socket, user: user} do
    other_user = insert(:user, name: "other-user")
    group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: user.id,
        group_task_id: group_task.id,
        name: "Authorized Tournament",
        slug: "authorized-tournament",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60,
        last_round_started_at: NaiveDateTime.utc_now(:second),
        require_invitation: false
      })
      |> Repo.insert!()

    topic = "group_tournament:#{group_tournament.id}"

    Context.get_or_create(user, group_tournament)
    Context.get_or_create(other_user, group_tournament)

    {:ok, _player} =
      GroupTournamentContext.create_or_update_player(group_tournament, user.id, %{
        lang: "python",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    {:ok, _player} =
      GroupTournamentContext.create_or_update_player(group_tournament, other_user.id, %{
        lang: "python",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    {:ok, _response, socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    other_token = Phoenix.Token.sign(socket(UserSocket), "user_token", other_user.id)
    {:ok, other_socket} = connect(UserSocket, %{"token" => other_token})

    {:ok, _other_response, other_socket} = subscribe_and_join(other_socket, GroupTournamentChannel, topic)

    {:ok, other_token_record} = GroupTournamentContext.create_or_rotate_token(group_tournament, other_user.id)

    Application.put_env(
      :codebattle,
      :group_task_runner_response,
      {:ok, %Req.Response{status: 200, body: %{"winner_id" => other_user.id}}}
    )

    {:ok, _solution} =
      GroupTournamentContext.create_solution_from_token_and_run(other_token_record.token, %{
        "solution" => Base.encode64("def solution():\n    return 8\n"),
        "lang" => "Python"
      })

    other_user_ugt = Context.get(other_user.id, group_tournament.id)

    [other_user_run] =
      group_tournament
      |> GroupTournamentContext.list_runs(limit: 10)
      |> Enum.filter(&(&1.user_group_tournament_id == other_user_ugt.id))

    tournament_id = group_tournament.id
    user_id = other_user.id
    group_task_id = group_task.id
    other_user_run_id = other_user_run.id

    assert_push("group_tournament:run_updated", %{
      group_tournament_id: ^tournament_id,
      user_id: ^user_id,
      run_id: received_run_id
    })

    assert is_integer(received_run_id)

    ref = push(socket, "group_tournament:run:request", %{"run_id" => other_user_run_id})
    assert_reply(ref, :error, %{reason: "not_found"})

    ref = push(other_socket, "group_tournament:run:request", %{"run_id" => other_user_run_id})

    assert_reply(
      ref,
      :ok,
      %{
        run: %{
          id: ^other_user_run_id,
          group_tournament_id: ^tournament_id,
          group_task_id: ^group_task_id,
          user_id: ^user_id
        }
      }
    )
  end

  test "start_group_tournament starts the tournament when invite is accepted", %{
    socket: socket,
    topic: topic,
    user: user
  } do
    {:ok, response, socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    # Invite should be in "invited" state after join (fake adapter returns pending for get_invite)
    assert %{invite: %{state: "invited"}, status: "waiting_participants"} = response

    # Manually mark invite as accepted (simulating admin override or platform acceptance)
    tournament_id = topic |> String.split(":") |> List.last() |> String.to_integer()
    invite = InviteContext.get_invite(user.id, tournament_id)

    invite
    |> Codebattle.ExternalPlatformInvite.changeset(%{state: "accepted"})
    |> Repo.update!()

    # Push start_group_tournament — should succeed now
    ref = push(socket, "start_group_tournament", %{})
    assert_reply(ref, :ok, %{status: "waiting_participants"})

    # The tournament transitions to "active" asynchronously via handle_info(:start_tournament)
    Process.sleep(50)
    gt = GroupTournamentContext.get_group_tournament!(tournament_id)
    assert gt.state == "active"
  end

  test "start_group_tournament pushes status_updated to the client", %{
    socket: socket,
    topic: topic,
    user: user
  } do
    {:ok, _response, socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    tournament_id = topic |> String.split(":") |> List.last() |> String.to_integer()
    invite = InviteContext.get_invite(user.id, tournament_id)

    invite
    |> Codebattle.ExternalPlatformInvite.changeset(%{state: "accepted"})
    |> Repo.update!()

    ref = push(socket, "start_group_tournament", %{})
    assert_reply(ref, :ok, _)

    # The server broadcasts status_updated after async transition to "active"
    assert_push("group_tournament:status_updated", %{status: "active"})
  end

  test "start_group_tournament fails when invite is not accepted", %{
    socket: socket,
    topic: topic
  } do
    {:ok, _response, socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    # Invite is in "invited" state, not "accepted"
    ref = push(socket, "start_group_tournament", %{})
    assert_reply(ref, :error, %{reason: "invitation_not_accepted"})
  end

  test "start_group_tournament fails when tournament is already active", %{
    socket: socket,
    topic: topic,
    user: user
  } do
    {:ok, _response, socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    # Mark invite as accepted
    tournament_id = topic |> String.split(":") |> List.last() |> String.to_integer()
    invite = InviteContext.get_invite(user.id, tournament_id)

    invite
    |> Codebattle.ExternalPlatformInvite.changeset(%{state: "accepted"})
    |> Repo.update!()

    # First start succeeds
    ref = push(socket, "start_group_tournament", %{})
    assert_reply(ref, :ok, _)

    # Wait for async transition to "active"
    Process.sleep(50)

    # Second start fails — already active
    ref = push(socket, "start_group_tournament", %{})
    assert_reply(ref, :error, %{reason: "invalid_state"})
  end

  test "request_invite_update returns current invite state", %{
    socket: socket,
    topic: topic
  } do
    {:ok, _response, socket} = subscribe_and_join(socket, GroupTournamentChannel, topic)

    ref = push(socket, "request_invite_update", %{})

    assert_reply(ref, :ok, %{
      invite: %{state: "invited"},
      platform_error: nil
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
