defmodule Codebattle.Tournament.BanPlayerTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament

  setup do
    tasks = insert_list(3, :task, level: "easy", time_to_solve_sec: 60)
    insert(:task_pack, name: "ban-player-pack", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user, name: "creator")
    [cheater, opponent] = users = [insert(:user, name: "cheater"), insert(:user, name: "opponent")]

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ban player",
        "description" => "ban and release",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ban-player-pack",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "swiss",
        "state" => "waiting_participants",
        "rounds_limit" => "3",
        "players_limit" => 2,
        "use_chat" => "false"
      })

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: creator, time_step_ms: 20_000, min_time_sec: 0})

    tournament = wait_for_playing_match(tournament.id)
    [match] = get_matches(tournament, "playing")

    %{tournament: tournament, game_id: match.game_id, cheater: cheater, opponent: opponent}
  end

  test "ban, game times out, release: tournament and game both see the release", ctx do
    %{tournament: tournament, game_id: game_id, cheater: cheater} = ctx
    Codebattle.PubSub.subscribe("game:#{game_id}")

    banned =
      Tournament.Server.handle_event(tournament.id, :toggle_ban_player, %{
        user_id: cheater.id,
        game_id: game_id,
        banned: true
      })

    assert get_player(banned, cheater.id).state == "banned"
    assert in_game_banned?(game_id, cheater.id)
    assert_receive %Message{event: "user:banned"}

    # The ban closes the match: by the time of the release the game is no longer "playing".
    {:ok, _game} = GameContext.trigger_timeout(game_id)

    released =
      Tournament.Server.handle_event(tournament.id, :toggle_ban_player, %{
        user_id: cheater.id,
        game_id: game_id,
        banned: false
      })

    assert get_player(released, cheater.id).state != "banned"
    assert released.cheater_ids == []
    refute in_game_banned?(game_id, cheater.id)
    assert_receive %Message{event: "user:unbanned"}

    # Asking for the state it already has changes nothing (no accidental re-ban).
    again =
      Tournament.Server.handle_event(tournament.id, :toggle_ban_player, %{
        user_id: cheater.id,
        game_id: game_id,
        banned: false
      })

    assert get_player(again, cheater.id).state != "banned"
    refute in_game_banned?(game_id, cheater.id)
  end

  test "release without game_id still clears the ban in the player's latest game", ctx do
    %{tournament: tournament, game_id: game_id, cheater: cheater} = ctx

    Tournament.Server.handle_event(tournament.id, :toggle_ban_player, %{user_id: cheater.id})
    assert in_game_banned?(game_id, cheater.id)
    {:ok, _game} = GameContext.trigger_timeout(game_id)

    released = Tournament.Server.handle_event(tournament.id, :toggle_ban_player, %{user_id: cheater.id})

    assert get_player(released, cheater.id).state != "banned"
    refute in_game_banned?(game_id, cheater.id)
  end

  defp in_game_banned?(game_id, user_id) do
    game_id |> GameContext.get_game!() |> Map.fetch!(:players) |> Enum.find(&(&1.id == user_id)) |> Map.fetch!(:is_banned)
  end

  defp wait_for_playing_match(tournament_id, attempts \\ 250)
  defp wait_for_playing_match(_tournament_id, 0), do: flunk("the first round did not start")

  defp wait_for_playing_match(tournament_id, attempts) do
    tournament = Tournament.Context.get(tournament_id)

    if tournament.state == "active" and get_matches(tournament, "playing") != [] do
      tournament
    else
      Process.sleep(20)
      wait_for_playing_match(tournament_id, attempts - 1)
    end
  end
end
