defmodule Codebattle.Tournament.IndividualTest do
  use Codebattle.IntegrationCase, async: false

  import CodebattleWeb.Factory
  alias Codebattle.Tournament.Helpers

  def build_team_player(user, params \\ %{}) do
    struct(Codebattle.Tournament.Types.Player, Map.from_struct(user)) |> Map.merge(params)
  end

  test "#maybe_start_new_step do not calls next step" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [%{state: "finished", game_id: 2, players: [player1, player2]}]

    tournament =
      insert(:team_tournament,
        step: 0,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches ++ [%{state: "active", game_id: 3, players: [player1, player2]}]
        }
      )

    new_tournament =
      tournament
      |> Helpers.maybe_start_new_step()

    assert new_tournament.step == 0

    states = new_tournament.data.matches |> Enum.map(fn x -> x.state end)

    assert states == ["finished", "active"]
  end

  test "#maybe_start_new_step calls next step" do
    user1 = insert(:user)
    user2 = insert(:user)

    insert(:task, level: "elementary")

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [%{state: "finished", game_id: 2, players: [player1, player2]}]

    tournament =
      insert(:team_tournament,
        step: 0,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        }
      )

    new_tournament =
      tournament
      |> Helpers.maybe_start_new_step()

    assert new_tournament.step == 1

    states = new_tournament.data.matches |> Enum.map(fn x -> x.state end)

    assert states == ["finished", "active"]
  end

  test "#maybe_start_new_step finishs tournament after 3 scores" do
    user1 = insert(:user)
    user2 = insert(:user)

    insert(:task, level: "elementary")

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [
      %{
        round_id: 0,
        state: "finished",
        players: [Map.merge(player1, %{game_result: "won"}), player2]
      },
      %{
        round_id: 1,
        state: "finished",
        players: [Map.merge(player1, %{game_result: "won"}), player2]
      },
      %{
        round_id: 2,
        state: "finished",
        players: [Map.merge(player1, %{game_result: "won"}), player2]
      }
    ]

    tournament =
      insert(:team_tournament,
        step: 3,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        }
      )

    new_tournament =
      tournament
      |> Helpers.maybe_start_new_step()

    assert new_tournament.state == "finished"
  end

  test "#maybe_start_new_step finishs tournament after 3 scores with draws" do
    user1 = insert(:user)
    user2 = insert(:user)

    insert(:task, level: "elementary")

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [
      %{
        round_id: 0,
        state: "finished",
        players: [player1, player2]
      },
      %{
        round_id: 1,
        state: "finished",
        players: [player1, player2]
      },
      %{
        round_id: 2,
        state: "finished",
        players: [player1, player2]
      },
      %{
        round_id: 3,
        state: "finished",
        players: [player1, player2]
      },
      %{
        round_id: 4,
        state: "finished",
        players: [player1, player2]
      },
      %{
        round_id: 5,
        state: "finished",
        players: [Map.merge(player1, %{game_result: "won"}), player2]
      }
    ]

    tournament =
      insert(:team_tournament,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        }
      )

    new_tournament =
      tournament
      |> Helpers.maybe_start_new_step()

    assert new_tournament.state == "finished"
  end
end
