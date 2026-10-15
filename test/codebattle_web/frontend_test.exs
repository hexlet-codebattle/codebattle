defmodule CodebattleWeb.FrontendTest do
  use CodebattleWeb.ConnCase

  import Inertia.Testing

  alias Codebattle.Game.Context

  test "users get the lobby in the frontend layout", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.root_path(conn, :index))

    html = html_response(conn, 200)

    assert inertia_component(conn) == "Lobby"
    assert %{"active_games" => _, "user_token" => _, "branding" => %{logo_title: _}} = inertia_props(conn)
    assert html =~ "data-mantine-color-scheme"
    refute html =~ "inertia-shared-props"
  end

  test "the profile page", %{conn: conn} do
    user = insert(:user)
    other = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get(Routes.user_path(conn, :show, other.id))

    assert inertia_component(conn) == "UserProfile"
    assert %{"user_id" => user_id} = inertia_props(conn)
    assert user_id == to_string(other.id)
    assert html_response(conn, 200) =~ "data-mantine-color-scheme"
  end

  describe "simple pages" do
    setup %{conn: conn} do
      user = insert(:user)
      %{flagged: log_in_user(conn, user.id), user: user}
    end

    test "tasks list sends lean tasks", %{flagged: conn} do
      task = insert(:task, visibility: "public", state: "active")
      conn = get(conn, Routes.task_path(conn, :index))

      assert inertia_component(conn) == "TaskIndex"
      assert [listed | _] = Enum.filter(inertia_props(conn)["tasks"], &(&1.id == task.id))
      refute Map.has_key?(listed, :asserts)
    end

    test "task packs list and show", %{flagged: conn, user: user} do
      task = insert(:task, visibility: "public", state: "active")

      {:ok, pack} =
        Codebattle.Repo.insert(%Codebattle.TaskPack{
          name: "pack",
          state: "active",
          visibility: "public",
          task_ids: [task.id],
          creator_id: user.id
        })

      index = get(conn, Routes.task_pack_path(conn, :index))
      assert inertia_component(index) == "TaskPackIndex"

      show = get(conn, Routes.task_pack_path(conn, :show, pack.id))
      assert inertia_component(show) == "TaskPackShow"
      assert %{"can_edit" => true, "tasks" => [%{id: task_id}]} = inertia_props(show)
      assert task_id == task.id
    end

    test "clans list and show", %{flagged: conn, user: user} do
      {:ok, clan} = Codebattle.Clan.find_or_create_by_clan("Test clan", user.id)
      Codebattle.Repo.update!(Ecto.Changeset.change(user, clan_id: clan.id))

      index = get(conn, Routes.clan_path(conn, :index))
      assert inertia_component(index) == "ClanIndex"
      assert %{"sort" => "name", "order" => "asc"} = inertia_props(index)

      show = get(conn, Routes.clan_path(conn, :show, clan.id))
      assert inertia_component(show) == "ClanShow"
      assert %{"members" => [%{id: member_id}]} = inertia_props(show)
      assert member_id == user.id
    end

    test "task page gets the v2 layout with timestamps and creator", %{flagged: conn, user: user} do
      task = insert(:task, visibility: "public", state: "active", creator_id: user.id)
      conn = get(conn, Routes.task_path(conn, :show, task.id))

      assert inertia_component(conn) == "TaskPreview"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"

      assert %{"can_edit_task" => true, "task_meta" => %{creator: %{id: creator_id}, inserted_at: _}} =
               inertia_props(conn)

      assert creator_id == user.id
    end

    test "task pack form: new, invalid create, valid create", %{flagged: conn} do
      task = insert(:task, visibility: "public", state: "active")

      new = get(conn, Routes.task_pack_path(conn, :new))
      assert inertia_component(new) == "TaskPackForm"
      assert %{"task_pack" => nil, "visibility_types" => [_ | _]} = inertia_props(new)

      invalid =
        conn
        |> put_req_header("x-inertia", "true")
        |> post(Routes.task_pack_path(conn, :create), %{"task_pack" => %{"name" => "", "task_ids" => "x"}})

      assert redirected_to(invalid) == Routes.task_pack_path(conn, :new)
      assert %{name: _, task_ids: _} = Inertia.Testing.inertia_errors(invalid)

      created =
        post(conn, Routes.task_pack_path(conn, :create), %{
          "task_pack" => %{"name" => "new pack", "visibility" => "public", "task_ids" => "#{task.id}"}
        })

      assert redirected_to(created) =~ ~r{^/task_packs/\d+$}
    end

    test "settings page sends account fields, sessions and api tokens", %{flagged: conn, user: user} do
      {:ok, _token, _secret} = Codebattle.UserApiToken.create(user, %{"name" => "bot", "scopes" => ["read"]})

      conn = get(conn, Routes.user_setting_path(conn, :edit))

      assert inertia_component(conn) == "Settings"
      props = inertia_props(conn)
      assert [%{name: "bot", token_prefix: _}] = props["api_tokens"]
      assert "read" in props["api_token_scopes"]
      assert [%{current: true}] = props["user_sessions"]
      assert %{sound_settings: _, has_password: _, can_unlink_social: _, style_lang: _} = props["current_user"]
    end

    test "hall of fame and seasons render in the new layout", %{flagged: conn, user: user} do
      today = Date.utc_today()

      season =
        Codebattle.Repo.insert!(%Codebattle.Season{
          name: "7",
          year: today.year,
          starts_at: Date.add(today, -10),
          ends_at: Date.add(today, 10)
        })

      Codebattle.Repo.insert!(%Codebattle.SeasonResult{
        season_id: season.id,
        user_id: user.id,
        user_name: user.name,
        place: 1,
        total_points: 42
      })

      Codebattle.SeasonCache.invalidate()

      hof = get(conn, Routes.hall_of_fame_path(conn, :index))
      assert inertia_component(hof) == "HallOfFame"
      assert html_response(hof, 200) =~ "data-mantine-color-scheme"
      assert %{"current_season_players" => 1, "current_season_results" => [%{place: 1}]} = inertia_props(hof)

      show = get(conn, Routes.season_path(conn, :show, season.id))
      assert inertia_component(show) == "SeasonShow"
      assert %{"seasons" => [%{id: id}], "results" => [_]} = inertia_props(show)
      assert id == season.id

      assert inertia_component(get(conn, Routes.season_path(conn, :index))) == "Seasons"
    end

    test "tournaments page hosts the schedule; /schedule redirects there", %{flagged: conn} do
      assert redirected_to(get(conn, "/schedule")) == "/tournaments"

      index = get(conn, "/tournaments")
      assert inertia_component(index) == "TournamentIndex"
      assert html_response(index, 200) =~ "data-mantine-color-scheme"
      assert %{"task_pack_names" => _, "last_tournament" => nil} = inertia_props(index)
    end

    test "clans: create (and join), rename by creator, others refused", %{flagged: conn, user: user} do
      created = post(conn, Routes.clan_path(conn, :create), %{"clan" => %{"name" => "Rustaceans", "join" => "true"}})

      clan = Codebattle.Repo.get_by!(Codebattle.Clan, name: "Rustaceans")
      assert redirected_to(created) == Routes.clan_path(conn, :show, clan)
      assert clan.creator_id == user.id
      assert %{clan: "Rustaceans", clan_id: clan_id} = Codebattle.Repo.get!(Codebattle.User, user.id)
      assert clan_id == clan.id

      show = get(conn, Routes.clan_path(conn, :show, clan))
      assert %{"can_edit" => true} = inertia_props(show)

      patch(conn, Routes.clan_path(conn, :update, clan), %{"clan" => %{"name" => "Ferris", "long_name" => "Rust club"}})
      assert %{name: "Ferris", long_name: "Rust club"} = Codebattle.Repo.get!(Codebattle.Clan, clan.id)
      assert %{clan: "Ferris"} = Codebattle.Repo.get!(Codebattle.User, user.id)

      duplicate =
        conn
        |> put_req_header("x-inertia", "true")
        |> post(Routes.clan_path(conn, :create), %{"clan" => %{"name" => "Ferris"}})

      assert %{name: _} = Inertia.Testing.inertia_errors(duplicate)

      stranger = insert(:user)

      build_conn()
      |> Plug.Test.init_test_session(%{})
      |> log_in_user(stranger.id)
      |> patch(Routes.clan_path(conn, :update, clan), %{"clan" => %{"name" => "Hijacked"}})

      assert %{name: "Ferris"} = Codebattle.Repo.get!(Codebattle.Clan, clan.id)
    end

    test "tournament edit sends the editable settings", %{flagged: conn, user: user} do
      tournament = insert(:tournament, creator_id: user.id, name: "Byte Brawl", players_limit: 32)

      conn = get(conn, Routes.tournament_path(conn, :edit, tournament.id))

      assert inertia_component(conn) == "TournamentEdit"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"

      assert %{"tournament" => %{id: id, name: "Byte Brawl", players_limit: 32, creator: %{name: name}}} =
               inertia_props(conn)

      assert id == tournament.id
      assert name == user.name
    end

    test "tournament room renders in the new layout", %{flagged: conn, user: user} do
      tournament = insert(:tournament, creator_id: user.id, type: "swiss")

      conn = get(conn, Routes.tournament_path(conn, :show, tournament.id))

      assert inertia_component(conn) == "TournamentRoom"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"
      assert %{"tournament_id" => id} = inertia_props(conn)
      assert id == tournament.id
    end

    test "a live game runs full-screen in the new layout", %{flagged: conn, user: user} do
      insert(:task, level: "easy")
      opponent = insert(:user)

      {:ok, game} =
        Context.create_game(%{state: "playing", players: [user, opponent], level: "easy"})

      conn = get(conn, Routes.game_path(conn, :show, game.id))

      assert inertia_component(conn) == "GameRoom"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"
      assert %{"game_id" => id, "game" => %{state: "playing"}} = inertia_props(conn)
      assert id == game.id
    end

    test "a waiting game shows the join screen to others in the new layout", %{flagged: conn} do
      insert(:task, level: "easy")
      creator = insert(:user)

      {:ok, game} =
        Context.create_game(%{state: "waiting_opponent", players: [creator], level: "easy"})

      conn = get(conn, Routes.game_path(conn, :show, game.id))

      assert inertia_component(conn) == "GameRoom"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"
      assert %{"game" => %{state: "waiting_opponent"}} = inertia_props(conn)
    end

    test "a finished game opens as history in the new layout", %{flagged: conn, user: user} do
      game = insert(:game, state: "game_over", players: [%Codebattle.Game.Player{id: user.id, name: user.name}])

      conn = get(conn, Routes.game_path(conn, :show, game.id))

      assert inertia_component(conn) == "GameRoom"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"
      assert %{"is_record" => true, "has_playbook" => false, "game_id" => id} = inertia_props(conn)
      assert id == game.id
    end

    test "a live game that is over opens its history with ?history=1", %{flagged: conn, user: user} do
      insert(:task, level: "easy")
      opponent = insert(:user)

      {:ok, game} =
        Context.create_game(%{state: "playing", players: [user, opponent], level: "easy"})

      {:ok, _game} = Context.give_up(game.id, user)

      conn = get(conn, Routes.game_path(conn, :show, game.id, history: "1"))

      assert inertia_component(conn) == "GameRoom"
      assert %{"is_record" => true, "has_playbook" => true, "is_live" => true} = inertia_props(conn)
    end

    test "during play only admins get the history; players stay in the game", %{flagged: player_conn, user: user} do
      insert(:task, level: "easy")
      opponent = insert(:user)

      {:ok, game} =
        Context.create_game(%{state: "playing", players: [user, opponent], level: "easy"})

      player_conn = get(player_conn, Routes.game_path(player_conn, :show, game.id, history: "1"))
      refute Map.has_key?(inertia_props(player_conn), "is_record")

      admin = insert(:admin)

      admin_conn =
        build_conn()
        |> Plug.Test.init_test_session(%{})
        |> log_in_user(admin.id)
        |> get(Routes.game_path(build_conn(), :show, game.id, history: "1"))

      assert %{"is_record" => true, "is_live" => true} = inertia_props(admin_conn)
    end

    test "the tournament stream renders in the new layout for its moderators", %{flagged: conn, user: user} do
      tournament = insert(:tournament, creator_id: user.id, type: "swiss")

      conn = get(conn, "/tournaments/#{tournament.id}/stream")

      assert inertia_component(conn) == "TournamentStream"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"
      assert %{"tournament_id" => id} = inertia_props(conn)
      assert id == tournament.id
    end

    test "a game's broadcast screen is /games/:id/stream", %{flagged: conn, user: user} do
      insert(:task, level: "easy")
      opponent = insert(:user)

      {:ok, game} =
        Context.create_game(%{state: "playing", players: [user, opponent], level: "easy"})

      conn = get(conn, "/games/#{game.id}/stream")

      assert inertia_component(conn) == "GameStream"
      assert html_response(conn, 200) =~ "data-mantine-color-scheme"
    end
  end

  test "guests get the landing page", %{conn: conn} do
    conn = get(conn, Routes.root_path(conn, :index))

    assert inertia_component(conn) == "Landing"
    assert %{"leaderboard" => [], "version" => _} = inertia_props(conn)
    assert html_response(conn, 200) =~ "data-mantine-color-scheme"
  end
end
