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
  @callback finish_tournament?(Tournament.t()) :: boolean()
  @callback default_meta() :: map()

  defmacro __using__(_opts) do
    quote location: :keep do
      @behaviour Tournament.Base
      import Tournament.Helpers

      def add_player(tournament, player) do
        update_in(tournament.players, fn players ->
          Map.put(players, to_id(player.id), Tournament.Player.new!(player))
        end)
        |> Map.put(:players_count, players_count(tournament))
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

      def restart(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament
          |> update_struct(%{
            players: %{},
            meta: default_meta(),
            matches: %{},
            break_state: "off",
            players_count: 0,
            current_round: 0,
            last_round_ended_at: nil,
            last_round_started_at: nil,
            winner_ids: [],
            starts_at: DateTime.utc_now(:second) |> DateTime.add(5 * 60, :second),
            state: "waiting_participants"
          })
        else
          tournament
        end
      end

      def restart(tournament, _user), do: tournament

      def start(tournament = %{state: "waiting_participants"}, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament =
            tournament
            |> complete_players()

          tournament
          |> update_struct(%{
            players_count: players_count(tournament),
            state: "active"
          })
          |> broadcast_tournament_started()
          |> start_round()
        else
          tournament
        end
      end

      def start(tournament, _params), do: tournament

      def stop_round_break(tournament) do
        tournament
        |> increment_current_round()
        |> start_round()
      end

      def handle_game_result(tournament, params) do
        match = get_match(tournament, params.ref)
        winner_id = pick_game_winner_id(match.player_ids, params.player_results)

        tournament =
          update_in(
            tournament.matches[to_id(params.ref)],
            &%{
              &1
              | state: params.game_state,
                winner_id: winner_id,
                player_results: params.player_results
            }
          )

        params.player_results
        |> Map.values()
        |> Enum.filter(fn player_result -> tournament.players[to_id(player_result.id)] end)
        |> Enum.reduce(
          tournament,
          fn player_result, tournament ->
            update_in(
              tournament.players[to_id(player_result.id)],
              &%{
                &1
                | score: &1.score + player_result.score,
                  lang: player_result.lang,
                  wins_count: &1.wins_count + if(player_result.result == "won", do: 1, else: 0)
              }
            )
          end
        )
      end

      def finish_match(tournament, params) do
        tournament
        |> handle_game_result(params)
        |> maybe_start_rematch(params)
        |> maybe_finish_round()
      end

      def maybe_finish_round(tournament) do
        if round_ends_by_time?(tournament) or
             Enum.any?(get_matches(tournament), &(&1.state == "playing")) do
          tournament
        else
          do_finish_round_and_next_step(tournament)
        end
      end

      def finish_round(tournament) do
        matches_to_finish = get_matches(tournament, "playing")

        new_tournament =
          Enum.reduce(matches_to_finish, tournament, fn match_to_finish, acc ->
            player_results =
              case Game.Context.fetch_game(match_to_finish.game_id) do
                {:ok, game} -> Game.Helpers.get_player_results(game)
                {:error, _reason} -> %{}
              end

            Game.Context.trigger_timeout(match_to_finish.game_id)

            acc =
              update_in(
                acc.matches[to_id(match_to_finish.id)],
                &%{&1 | player_results: player_results, state: "timeout"}
              )

            player_results
            |> Map.values()
            |> Enum.filter(fn player_result -> tournament.players[to_id(player_result.id)] end)
            |> Enum.reduce(
              acc,
              fn player_result, tournament ->
                update_in(
                  tournament.players[to_id(player_result.id)],
                  &%{&1 | score: &1.score + player_result.score, lang: player_result.lang}
                )
              end
            )
          end)

        do_finish_round_and_next_step(new_tournament)
      end

      def do_finish_round_and_next_step(tournament) do
        tournament
        |> update_struct(%{last_round_ended_at: NaiveDateTime.utc_now(:second)})
        |> calculate_round_results()
        |> broadcast_round_finished()
        |> maybe_finish_tournament()
        |> start_round_or_break_or_finish()
      end

      defp maybe_start_rematch(tournament, params) do
        if round_ends_by_time?(tournament) and seconds_to_end_round(tournament) > 15 do
          finished_match = get_match(tournament, params.ref)

          match_id = Enum.count(tournament.matches)
          player_ids = finished_match.player_ids

          players =
            player_ids
            |> Enum.map(&get_player(tournament, &1))
            |> Enum.map(&Tournament.Player.new!/1)

          # TODO: add timeout without blocking server for rematches
          timeout_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms)
          :timer.sleep(timeout_ms)
          game_id = create_game(tournament, match_id, players)

          match = %Tournament.Match{
            id: match_id,
            game_id: game_id,
            state: "playing",
            player_ids: player_ids,
            round: tournament.current_round
          }

          put_in(tournament.matches[to_id(match_id)], match)
        else
          tournament
        end
      end

      defp pick_game_winner_id(player_ids, player_results) do
        Enum.find(player_ids, &(player_results[&1] && player_results[&1].result == "won"))
      end

      defp start_round_or_break_or_finish(tournament = %{state: "finished"}) do
        tournament
      end

      defp start_round_or_break_or_finish(
             tournament = %{
               state: "active",
               break_duration_seconds: break_duration_seconds
             }
           )
           when break_duration_seconds not in [nil, 0] do
        Process.send_after(
          self(),
          {:stop_round_break, tournament.current_round},
          :timer.seconds(tournament.break_duration_seconds)
        )

        update_struct(tournament, %{break_state: "on"})
      end

      defp start_round_or_break_or_finish(tournament) do
        tournament
        |> increment_current_round()
        |> start_round()
      end

      defp increment_current_round(tournament) do
        update_struct(tournament, %{current_round: tournament.current_round + 1})
      end

      defp start_round(tournament) do
        tournament
        |> update_struct(%{
          break_state: "off",
          last_round_started_at: NaiveDateTime.utc_now(:second)
        })
        |> start_round_timer()
        |> maybe_set_task_for_round()
        |> build_matches()
        |> db_save!()
        |> broadcast_round_created()
      end

      def create_game(tournament, ref, players) do
        game_timeout =
          if round_ends_by_time?(tournament) do
            seconds_to_end_round(tournament)
          else
            tournament.match_timeout_seconds
          end

        {:ok, game} =
          Game.Context.create_game(%{
            state: "playing",
            task: get_current_round_task(tournament),
            ref: ref,
            level: tournament.level,
            tournament_id: tournament.id,
            timeout_seconds: game_timeout,
            use_chat: tournament.use_chat,
            players: players
          })

        game.id
      end

      def update_struct(tournament, params) do
        tournament |> Ecto.Changeset.change(params) |> Ecto.Changeset.apply_action!(:update)
      end

      def db_save!(tournament), do: Tournament.Context.upsert!(tournament)

      defp maybe_finish_tournament(tournament) do
        if finish_tournament?(tournament) do
          tournament
          |> update_struct(%{state: "finished", finished_at: TimeHelper.utc_now()})
          |> set_stats()
          |> set_winner_ids()
          |> db_save!()
          |> broadcast_tournament_finished()

          # TODO: implement tournament termination in 15 mins
          # Tournament.GlobalSupervisor.terminate_tournament(tournament.id, 15 mins)
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

      defp start_round_timer(tournament) do
        Process.send_after(
          self(),
          {:finish_round_force, tournament.current_round},
          :timer.seconds(tournament.match_timeout_seconds)
        )

        tournament
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

      defp broadcast_round_created(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_created", %{tournament: tournament})
        tournament
      end

      defp broadcast_round_finished(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_finished", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_started(tournament) do
        Codebattle.PubSub.broadcast("tournament:started", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_finished(tournament) do
        Codebattle.PubSub.broadcast("tournament:finished", %{tournament_id: tournament.id})
        tournament
      end

      defp round_ends_by_time?(%{type: "swiss"}), do: true
      defp round_ends_by_time?(_), do: false

      defp seconds_to_end_round(tournament) do
        tournament.match_timeout_seconds -
          NaiveDateTime.diff(NaiveDateTime.utc_now(), tournament.last_round_started_at)
      end
    end
  end
end
