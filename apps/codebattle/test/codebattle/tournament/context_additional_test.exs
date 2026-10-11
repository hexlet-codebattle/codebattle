defmodule Codebattle.Tournament.ContextAdditionalTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player

  test "restores an empty live-tournament set" do
    assert :ok = Tournament.Context.restore_live_tournaments()
  end

  test "duplicates tournaments, including fresh access tokens" do
    creator = insert(:user)

    source =
      insert(:tournament,
        creator_id: creator.id,
        type: "swiss",
        access_type: "token",
        access_token: "source-token",
        starts_at: DateTime.utc_now(:second)
      )

    assert {:ok, copies} = Tournament.Context.duplicate(source, creator, 2)
    assert Enum.map(copies, & &1.name) == ["#{source.name} #1", "#{source.name} #2"]
    assert Enum.all?(copies, &(&1.access_type == "token"))
    assert Enum.all?(copies, &(is_binary(&1.access_token) and &1.access_token != source.access_token))
    assert copies |> Enum.map(& &1.access_token) |> Enum.uniq() |> length() == 2

    Enum.each(copies, fn copy ->
      on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(copy.id) end)
    end)
  end

  test "returns every duplicate validation error" do
    creator = insert(:user)
    invalid = %Tournament{name: nil, type: "swiss", starts_at: DateTime.utc_now(:second)}

    assert {:error, [{:error, changeset}]} = Tournament.Context.duplicate(invalid, creator)
    refute changeset.valid?
  end

  test "updates and upserts persisted and ETS-backed tournament snapshots" do
    creator = insert(:user)

    tournament =
      :tournament
      |> insert(creator_id: creator.id, state: "finished")
      |> Codebattle.Repo.preload(:creator)

    assert {:ok, updated} = Tournament.Context.update(tournament, %{"description" => "updated description"})
    assert updated.description == "updated description"

    assert %{description: "updated twice"} =
             updated
             |> Map.put(:description, "updated twice")
             |> Tournament.Context.upsert!()

    players_table = Tournament.Players.create_table(tournament.id)
    matches_table = Tournament.Matches.create_table(tournament.id)
    with_tables = %{updated | players_table: players_table, matches_table: matches_table}

    player = Player.new!(%{id: creator.id, name: creator.name, state: "active"})
    match = %Match{id: 8, game_id: 80, player_ids: [creator.id], state: "game_over"}
    Tournament.Players.put_player(with_tables, player)
    Tournament.Matches.put_match(with_tables, match)

    snapshot = Tournament.Context.upsert!(with_tables, :with_ets)
    assert snapshot.players[creator.id].id == creator.id
    assert snapshot.matches[8].game_id == 80

    # The server's older struct must not undo the latest ETS snapshot when it
    # saves only scalar state, e.g. when opening the next Ladder bucket.
    Tournament.Context.upsert!(%{with_tables | description: "new round", current_round_position: 1})
    persisted = Tournament.Context.get_from_db!(tournament.id)
    assert persisted.description == "new round"
    assert persisted.current_round_position == 1
    assert Helpers.get_player(persisted, creator.id).id == creator.id
    assert Helpers.get_match(persisted, 8).game_id == 80
  end

  test "moves an upcoming tournament live and accepts struct-based events" do
    user = insert(:user)

    tournament =
      insert(:tournament,
        type: "swiss",
        state: "upcoming",
        starts_at: DateTime.add(DateTime.utc_now(:second), 60, :minute),
        meta: %{game_passwords: ["one-time"]}
      )

    on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(tournament.id) end)

    assert :ok = Tournament.Context.move_upcoming_to_live(tournament)
    live = Tournament.Context.get!(tournament.id)
    assert live.state == "waiting_participants"

    assert %Tournament{} = Tournament.Context.handle_event(live, :join, %{user: user})
    assert Helpers.get_player(Tournament.Context.get!(live.id), user.id)
    assert Tournament.Context.check_pass_code(live.id, "one-time")
    assert %Tournament{} = Tournament.Context.remove_pass_code(live.id, "one-time")
    refute Tournament.Context.check_pass_code(live.id, "one-time")
  end

  test "restore ignores terminal tournaments and tolerates an already-running waiting tournament" do
    finished = insert(:tournament, type: "swiss", state: "finished")
    on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(finished.id) end)
    assert :ok = Tournament.Context.restore_after_release(finished)

    creator = insert(:user)
    starts_at = Calendar.strftime(NaiveDateTime.utc_now(), "%Y-%m-%dT%H:%M")

    assert {:ok, waiting} =
             Tournament.Context.create(%{
               "creator" => creator,
               "description" => "already running restore",
               "name" => "Already running restore",
               "players_limit" => 8,
               "starts_at" => starts_at,
               "type" => "swiss"
             })

    on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(waiting.id) end)
    assert :ok = waiting.id |> Tournament.Context.get_from_db!() |> Tournament.Context.restore_after_release()
    assert Tournament.Context.get!(waiting.id).state == "waiting_participants"

    assert Enum.any?(Tournament.Context.list_live_and_finished(creator), &(&1.id == waiting.id))
    assert Enum.any?(Tournament.Context.get_live_tournaments_for_user(creator), &(&1.id == waiting.id))
    assert Tournament.Context.get_live_tournaments_count() >= 1
    assert Tournament.Context.get_live_tournament_players(Tournament.Context.get!(waiting.id)) == []

    assert %Tournament{} = Tournament.Context.recalculate_results(waiting.id)
    assert :ok = Tournament.Context.restart(Tournament.Context.get!(waiting.id))
    assert Tournament.Context.get!(waiting.id).state == "waiting_participants"

    refute Tournament.Context.check_pass_code(-1, "missing")
  end

  test "classifies every restorable tournament strategy and recalculates a non-finished snapshot as a no-op" do
    swiss = insert(:tournament, type: "swiss", state: "waiting_participants")
    ladder = insert(:tournament, type: "ladder", state: "active")
    retired = insert(:tournament, type: "top200", state: "active")

    restored = Map.new(Tournament.Context.get_tournament_for_restore(), &{&1.id, &1})
    assert restored[swiss.id].module == Tournament.Swiss
    assert restored[ladder.id].module == Tournament.Ladder
    assert restored[swiss.id].is_live
    assert restored[ladder.id].is_live
    refute Map.has_key?(restored, retired.id)

    upcoming = insert(:tournament, type: "swiss", state: "upcoming")
    assert Tournament.Context.recalculate_results(upcoming.id).id == upcoming.id
  end
end
