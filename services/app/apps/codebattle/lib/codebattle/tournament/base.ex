defmodule Codebattle.Tournament.Base do
  # credo:disable-for-this-file Credo.Check.Refactor.LongQuoteBlocks

  alias Codebattle.Game
  alias Codebattle.Tournament

  @moduledoc """
  Defines interface for tournament type
  """
  @callback build_matches(Tournament.t()) :: Tournament.t()
  @callback calculate_round_results(Tournament.t()) :: Tournament.t()
  @callback complete_players(Tournament.t()) :: Tournament.t()
  @callback maybe_finish(Tournament.t()) :: Tournament.t()

  defmacro __using__(_opts) do
    quote do
      @behaviour Tournament.Base
      import Tournament.Helpers

      def add_player(tournament, player) do
        update_in(tournament.players, fn players ->
          Map.put(players, to_id(player.id), Tournament.Player.new!(player))
        end)
      end

      def add_players(tournament, %{users: users}) do
        Enum.reduce(users, tournament, &add_player(&2, &1))
      end

      def join(tournament = %{state: "waiting_participants"}, params = %{users: users}) do
        player_params = Map.drop(params, [:users])
        Enum.reduce(users, tournament, &join(&2, Map.put(player_params, :user, &1)))
      end

      def join(tournament = %{state: "waiting_participants"}, params) do
        player =
          params.user
          |> Map.put(:lang, params.user.lang || tournament.default_language)
          |> Map.put(:team_id, Map.get(params, :team_id))

        if players_count(tournament) < tournament.players_limit do
          add_player(tournament, player)
        else
          tournament
        end
      end

      def join(tournament, _), do: tournament

      def leave(tournament, %{user: user}) do
        leave(tournament, %{user_id: user.id})
      end

      def leave(tournament, %{user_id: user_id}) do
        new_players = Map.drop(tournament.players, [to_id(user_id)])

        update!(tournament, %{players: new_players})
      end

      def leave(tournament, _user_id), do: tournament

      def open_up(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update!(tournament, %{access_type: "public"})
        else
          tournament
        end
      end

      def cancel(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          new_tournament = update!(tournament, %{state: "canceled"})

          Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

          new_tournament
        else
          tournament
        end
      end

      def start(tournament = %{state: "waiting_participants"}, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament =
            tournament
            |> complete_players()
            |> start_round()

          tournament
          |> update!(%{
            players_count: players_count(tournament),
            last_round_started_at: NaiveDateTime.utc_now(),
            state: "active"
          })
        else
          tournament
        end
      end

      def start(tournament, _params), do: tournament

      def restart(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament
          |> update!(%{
            players: %{},
            matches: %{},
            players_count: 0,
            current_round: 0,
            last_round_started_at: nil,
            state: "waiting_participants"
          })
        else
          tournament
        end
      end

      def restart(tournament, _user), do: tournament

      def finish_match(tournament, payload) do
        tournament
        |> update_match(payload)
        |> maybe_start_next_round()
      end

      def update_match(tournament, params) do
        case params.game_state do
          "timeout" ->
            # TODO: just for bot experiments, do not update score on timeout
            match = tournament.matches[to_id(params.ref)]
            winner_id = Enum.random(match.player_ids)

            new_player =
              Map.update!(
                tournament.players[to_id(winner_id)],
                :score,
                &(&1 + Enum.random([1, 2, 3, 4, 5, 6, 7]))
              )

            tournament = put_in(tournament.players[to_id(winner_id)], new_player)

            update_in(tournament.matches[to_id(params.ref)], &%{&1 | state: "timeout"})

          "game_over" ->
            # TODO: add more params to game_result to better calc score
            match = tournament.matches[to_id(params.ref)]
            winner_id = pick_game_winner_id(match.player_ids, params.player_results)

            new_player = Map.update!(tournament.players[to_id(winner_id)], :score, &(&1 + 10))

            tournament =
              update_in(
                tournament.matches[to_id(params.ref)],
                &%{&1 | state: "game_over", winner_id: winner_id}
              )

            put_in(tournament.players[to_id(winner_id)], new_player)
        end
      end

      def maybe_start_next_round(tournament) do
        matches = get_matches(tournament)

        if Enum.any?(matches, fn match -> match.state == "playing" end) do
          tournament
        else
          tournament
          |> calculate_round_results()
          |> update!(%{
            current_round: tournament.current_round + 1,
            last_round_started_at: NaiveDateTime.utc_now()
          })
          |> maybe_finish()
          |> start_round()
        end
      end

      defp pick_game_winner_id(player_ids, player_results) do
        Enum.find(player_ids, &(player_results[&1] == "won"))
      end

      defp start_round(tournament = %{state: "finished"}), do: tournament

      defp start_round(tournament) do
        tournament
        |> maybe_set_task_for_round()
        |> build_matches()
        |> broadcast_new_round()
      end

      def create_game(tournament, ref, players) do
        {:ok, game} =
          Game.Context.create_game(%{
            state: "playing",
            task: get_current_round_task(tournament),
            ref: ref,
            level: tournament.level,
            tournament_id: tournament.id,
            timeout_seconds: tournament.match_timeout_seconds,
            players: players
          })

        game.id
      end

      def update!(tournament, params) do
        tournament |> Tournament.changeset(params) |> Ecto.Changeset.apply_action!(:update)
      end

      defp maybe_set_task_for_round(tournament = %{task_strategy: "round"}) do
        %{
          tournament
          | round_tasks:
              Map.put(
                tournament.round_tasks,
                to_id(tournament.current_round),
                get_task(tournament)
              )
        }
      end

      defp maybe_set_task_for_round(t), do: t

      defp get_task(tournament = %{task_provider: "task_pack"}) do
        # TODO: implement task_pack as a task provider
        Codebattle.Task.get_task_by_level(tournament.level)
      end

      defp get_task(tournament = %{task_provider: "tags"}) do
        # TODO: implement task_queue server by tags, fallback to level
        Codebattle.Task.get_task_by_level(tournament.level)
      end

      defp get_task(tournament = %{task_provider: "level"}) do
        Codebattle.Task.get_task_by_level(tournament.level)
      end

      defp broadcast_new_round(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_created", %{tournament: tournament})
        tournament
      end

      # for individual game
      defp get_new_duration(nil), do: 0
      # for team game
      defp get_new_duration(started_at),
        do: NaiveDateTime.diff(NaiveDateTime.utc_now(), started_at, :millisecond)
    end
  end
end
