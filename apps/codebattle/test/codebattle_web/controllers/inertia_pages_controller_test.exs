defmodule CodebattleWeb.InertiaPagesControllerTest do
  use CodebattleWeb.ConnCase, async: true

  import Inertia.Testing

  test "renders the hall of fame with explicit props", %{conn: conn} do
    conn = get(conn, Routes.hall_of_fame_path(conn, :index))

    assert inertia_component(conn) == "HallOfFame"

    assert %{
             "current_season" => nil,
             "current_season_results" => [],
             "previous_seasons_winners" => []
           } = inertia_props(conn)
  end

  test "renders the seasons index with explicit props", %{conn: conn} do
    conn = get(conn, Routes.season_path(conn, :index))

    assert inertia_component(conn) == "Seasons"
    assert %{"seasons" => []} = inertia_props(conn)
  end

  test "renders head-to-head data with explicit props", %{conn: conn} do
    user = insert(:user)
    opponent = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> get(Routes.head_to_head_path(conn, :show, user.id, opponent.id))

    assert inertia_component(conn) == "HeadToHead"
    assert %{"head_to_head" => %{players: players}} = inertia_props(conn)
    assert Enum.map(players, & &1.id) == [user.id, opponent.id]
  end

  test "renders a tournament player stream with explicit channel props", %{conn: conn} do
    user = insert(:user)
    creator = insert(:user)
    tournament = insert(:tournament, creator_id: creator.id)

    conn =
      get(
        conn,
        Routes.tournament_player_path(conn, :show, tournament.id, user.id)
      )

    assert inertia_component(conn) == "TournamentPlayer"

    assert %{
             "tournament_id" => tournament_id,
             "player_id" => player_id,
             "cancel_redirect_to_new_game" => true
           } = inertia_props(conn)

    assert tournament_id == tournament.id
    assert player_id == user.id
  end
end
