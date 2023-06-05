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
  @callback finish_tournament?(Tournament.t()) :: Tournament.t()

  defmacro __using__(_opts) do
    quote do
      @behaviour Tournament.Base
      import Tournament.Helpers

      @game_level_score %{
        "elementary" => 5,
        "easy" => 8,
        "medium" => 13,
        "hard" => 21
      }

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

        update_struct(tournament, %{players: new_players})
      end

      def leave(tournament, _user_id), do: tournament

      def open_up(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update_struct(tournament, %{access_type: "public"})
        else
          tournament
        end
      end

      def cancel(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          new_tournament = tournament |> update_struct(%{state: "canceled"}) |> db_save!()

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
            |> start_round_or_finish()

          tournament
          |> update_struct(%{
            players_count: players_count(tournament),
            last_round_started_at: NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second),
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
          |> update_struct(%{
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
        |> handle_game_result(payload)
        |> maybe_start_next_round()
      end

      def handle_game_result(tournament, params) do
        match = tournament.matches[to_id(params.ref)]
        winner_id = pick_game_winner_id(match.player_ids, params.player_results)

        tournament =
          update_in(
            tournament.matches[to_id(params.ref)],
            &%{&1 | state: params.game_state, winner_id: winner_id}
          )

        Enum.reduce(
          Map.values(params.player_results),
          tournament,
          fn player_result, tournament ->
            update_in(
              tournament.players[to_id(player_result.id)],
              &%{
                &1
                | score:
                    &1.score +
                      get_score(
                        player_result,
                        params.game_level,
                        tournament.match_timeout_seconds
                      ),
                  wins_count: &1.wins_count + if(player_result.result == "won", do: 1, else: 0)
              }
            )
          end
        )
      end

      def maybe_start_next_round(tournament) do
        matches = get_matches(tournament)

        if Enum.any?(matches, fn match -> match.state == "playing" end) do
          tournament
        else
          tournament
          |> calculate_round_results()
          |> maybe_finish()
          |> set_next_round_params()
          |> start_round_or_finish()
        end
      end

      defp pick_game_winner_id(player_ids, player_results) do
        Enum.find(player_ids, &(player_results[&1] == "won"))
      end

      defp set_next_round_params(tournament = %{state: "finished"}), do: tournament

      defp set_next_round_params(tournament) do
        update_struct(tournament, %{
          current_round: tournament.current_round + 1,
          last_round_started_at: NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)
        })
      end

      defp start_round_or_finish(tournament = %{state: "finished"}) do
        # TODO: implement tournament termination in 15 mins
        # Tournament.GlobalSupervisor.terminate_tournament(tournament.id, 15 mins)

        tournament
      end

      defp start_round_or_finish(tournament) do
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

      def update_struct(tournament, params) do
        tournament |> Ecto.Changeset.change(params) |> Ecto.Changeset.apply_action!(:update)
      end

      def db_save!(tournament), do: Tournament.Context.upsert!(tournament)

      defp maybe_finish(tournament) do
        if finish_tournament?(tournament) do
          tournament
          |> update_struct(%{state: "finished", finished_at: TimeHelper.utc_now()})
          |> set_stats()
          |> set_winner_ids()
          |> db_save!()
        else
          tournament
        end
      end

      defp set_stats(tournament) do
        update_struct(tournament, %{stats: get_stats(tournament)})
      end

      defp set_winner_ids(tournament) do
        update_struct(tournament, %{winner_ids: get_winner_ids(tournament)})
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

      def get_score(player_result, game_level, tournament_match_timeout_seconds) do
        # game_level_score is fibanachi based score for different task level
        # %{"elementary" => 5, "easy" => 8, "medium" => 13, "hard" => 21}
        game_level_score = @game_level_score[game_level]

        # base_winner_score = game_level_score / 2 for winner and 0 if user haven't won the match
        base_winner_score =
          if player_result.result == "won", do: @game_level_score[game_level] / 2, else: 0

        # test_count_k is a koefficient between [0, 1]
        # which linearly grow as test results
        test_count_k = player_result.result_percent / 100.0

        # duration_k is a koefficient between [0.33, 1]
        # duration_k = 0 if duration_sec is nil
        # duration_k = 1 if task was solved before 1/3 of match_timeout
        # duration_k linearly goes to 0.33 if task was solved after 1/3 of match time
        duration_k =
          cond do
            is_nil(player_result.duration_sec) -> 1
            player_result.duration_sec / tournament_match_timeout_seconds < 0.33 -> 1
            true -> 1.32 - player_result.duration_sec / tournament_match_timeout_seconds
          end

        round(base_winner_score + game_level_score * duration_k * test_count_k)
      end
    end
  end
end
