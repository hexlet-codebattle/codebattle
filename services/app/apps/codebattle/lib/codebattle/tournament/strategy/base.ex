defmodule Codebattle.Tournament.Base do
  # credo:disable-for-this-file Credo.Check.Refactor.LongQuoteBlocks
  @moduledoc """
  Defines interface for tournament type
  """
  alias Codebattle.Event
  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.WaitingRoom

  @callback build_round_pairs(Tournament.t()) :: {Tournament.t(), list(list(pos_integer()))}
  @callback calculate_round_results(Tournament.t()) :: Tournament.t()
  @callback complete_players(Tournament.t()) :: Tournament.t()
  @callback set_ranking(Tournament.t()) :: Tournament.t()
  @callback maybe_create_rematch(Tournament.t(), map()) :: Tournament.t()
  @callback finish_tournament?(Tournament.t()) :: boolean()
  @callback finish_round_after_match?(Tournament.t()) :: boolean()
  @callback reset_meta(map()) :: map()
  @callback game_type() :: String.t()

  defmacro __using__(_opts) do
    quote location: :keep do
      @behaviour Tournament.Base

      import Tournament.Helpers
      import Tournament.TaskProvider

      alias Codebattle.Bot
      alias Codebattle.Tournament.Score
      alias Codebattle.WaitingRoom
      alias Tournament.Round.Context

      require Logger

      def add_player(tournament, player) do
        tournament_player = Tournament.Player.new!(player)
        Tournament.Players.put_player(tournament, tournament_player)

        Tournament.Ranking.add_new_player(tournament, tournament_player)

        if tournament.use_clan do
          Tournament.Clans.add_players_clan(tournament, tournament_player)
        end

        Map.put(tournament, :players_count, players_count(tournament))
      end

      def add_players(tournament, %{users: users}) do
        Enum.reduce(users, tournament, &add_player(&2, &1))
      end

      def join(%{state: "waiting_participants"} = tournament, %{users: users} = params) do
        player_params = Map.delete(params, :users)
        Enum.reduce(users, tournament, &join(&2, Map.put(player_params, :user, &1)))
      end

      def join(%{state: "waiting_participants"} = tournament, params) do
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

      def join(%{state: "active", type: "arena"} = tournament, params) do
        player =
          params.user
          |> Map.put(:lang, params.user.lang || tournament.default_language)
          |> Map.put(:team_id, Map.get(params, :team_id))

        if players_count(tournament) < tournament.players_limit do
          tournament = add_player(tournament, player)
          new_player = Tournament.Players.get_player(tournament, params.user.id)

          Tournament.Players.put_player(tournament, %{
            new_player
            | state: "matchmaking_active",
              wr_joined_at: :os.system_time(:second)
          })

          tournament
        else
          tournament
        end
      end

      def join(tournament, _), do: tournament

      def leave(tournament, %{user: user}) do
        leave(tournament, %{user_id: user.id})
      end

      def leave(tournament, %{user_id: user_id}) do
        Tournament.Players.drop_player(tournament, user_id)
        Tournament.Ranking.drop_player(tournament, user_id)
        Map.put(tournament, :players_count, players_count(tournament))
      end

      def leave(tournament, _user_id), do: tournament

      def matchmaking_restart(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        if player.state in ["matchmaking_active", "active", "matchmaking_paused"] do
          new_player = %{
            player
            | state: "matchmaking_active",
              wr_joined_at: :os.system_time(:second)
          }

          Tournament.Players.put_player(tournament, new_player)

          Codebattle.PubSub.broadcast("tournament:player:matchmaking_started", %{
            tournament: tournament,
            player: new_player
          })
        end

        tournament
      end

      def matchmaking_pause(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        if player.state in ["matchmaking_active", "finished_round"] do
          new_player = %{player | state: "matchmaking_paused"}
          Tournament.Players.put_player(tournament, new_player)

          Codebattle.PubSub.broadcast("tournament:player:matchmaking_paused", %{
            tournament: tournament,
            player: new_player
          })
        end

        tournament
      end

      def matchmaking_resume(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        cond do
          player.state == "matchmaking_paused" &&
            tournament.break_state == "off" &&
              !player_finished_round?(tournament, player) ->
            new_player = %{
              player
              | state: "matchmaking_active",
                wr_joined_at: :os.system_time(:second)
            }

            Tournament.Players.put_player(tournament, new_player)

            Codebattle.PubSub.broadcast("tournament:player:matchmaking_resumed", %{
              tournament: tournament,
              player: new_player
            })

          player.state == "matchmaking_paused" ->
            new_player = %{player | state: "finished_round"}
            Tournament.Players.put_player(tournament, new_player)

            Codebattle.PubSub.broadcast("tournament:player:finished_round", %{
              tournament: tournament,
              player: new_player
            })

          true ->
            :noop
        end

        tournament
      end

      def ban_player(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        if player do
          new_player = %{player | state: "banned"}

          Tournament.Players.put_player(tournament, new_player)

          Codebattle.PubSub.broadcast("tournament:player:banned", %{
            tournament: tournament,
            player: new_player
          })
        end

        tournament
      end

      def unban_player(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        if player do
          new_player = %{player | state: "matchmaking_paused"}

          Codebattle.PubSub.broadcast("tournament:player:unbanned", %{
            tournament: tournament,
            player: new_player
          })

          Tournament.Players.put_player(tournament, %{player | state: "matchmaking_paused"})
          matchmaking_resume(tournament, %{user_id: user_id})
        end

        tournament
      end

      def open_up(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update_struct(tournament, %{access_type: "public"})
        else
          tournament
        end
      end

      def toggle_show_results(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update_struct(
            tournament,
            %{show_results: !Map.get(tournament, :show_results, true)}
          )
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
          Tournament.Round.disable_all_rounds(tournament.id)

          update_struct(tournament, %{
            players: %{},
            meta: reset_meta(tournament.meta),
            matches: %{},
            break_state: "off",
            players_count: 0,
            current_round_position: 0,
            current_round: nil,
            current_round_id: nil,
            last_round_ended_at: nil,
            last_round_started_at: nil,
            winner_ids: [],
            top_player_ids: [],
            starts_at: :second |> DateTime.utc_now() |> DateTime.add(5 * 60, :second),
            state: "waiting_participants"
          })
        else
          tournament
        end
      end

      def restart(tournament, _user), do: tournament

      def start(%{state: "waiting_participants"} = tournament, %{user: user} = params) do
        if can_moderate?(tournament, user) do
          tournament = complete_players(tournament)

          tournament
          |> update_struct(%{
            players_count: players_count(tournament),
            state: "active"
          })
          |> maybe_init_waiting_room(params)
          |> set_ranking()
          |> broadcast_tournament_started()
          |> start_round()
        else
          tournament
        end
      end

      def start(tournament, _params), do: tournament

      defp maybe_init_waiting_room(%{waiting_room_name: nil} = t, _params), do: t

      defp maybe_init_waiting_room(tournament, params) do
        state =
          params
          |> Map.put(:name, tournament.waiting_room_name)
          |> Map.put(:use_clan?, tournament.use_clan)
          |> Map.put(:use_sequential_tasks?, tournament.task_strategy == "sequential")
          |> then(&struct(%WaitingRoom.State{}, &1))

        send(self(), :match_waiting_room_players)

        %{tournament | waiting_room_state: state}
      end

      def start_round_force(tournament, params \\ %{})

      def start_round_force(%{state: "finished"} = tournament, _new_round_params), do: tournament

      def start_round_force(tournament, new_round_params) do
        tournament
        |> increment_current_round()
        |> start_round(new_round_params)
      end

      def finish_match(tournament, params) do
        tournament
        |> handle_game_result(params)
        |> maybe_create_rematch(params)
        |> maybe_finish_round_after_finish_match()
      end

      def handle_game_result(tournament, params) do
        match = get_match(tournament, params.ref)
        winner_id = pick_game_winner_id(match.player_ids, params.player_results)

        player_results =
          Map.new(params.player_results, fn {player_id, result} ->
            {player_id,
             Map.put(
               result,
               :score,
               get_score(
                 tournament.score_strategy,
                 match.level,
                 result.result_percent,
                 params.duration_sec
               )
             )}
          end)

        params.player_results
        |> Map.keys()
        |> Enum.each(fn player_id ->
          player = Tournament.Players.get_player(tournament, player_id)

          if player do
            player = %{
              player
              | score: player.score + player_results[player_id].score,
                lang: params.player_results[player_id].lang,
                wins_count:
                  player.wins_count +
                    if(player_results[player_id].result == "won", do: 1, else: 0)
            }

            Tournament.Players.put_player(tournament, player)

            Tournament.Ranking.update_player_result(
              tournament,
              player,
              player_results[player_id].score
            )
          end
        end)

        new_match = %{
          match
          | state: params.game_state,
            winner_id: winner_id,
            duration_sec: params.duration_sec,
            player_results: player_results,
            finished_at: TimeHelper.utc_now()
        }

        Tournament.Matches.put_match(tournament, new_match)

        Codebattle.PubSub.broadcast("tournament:match:upserted", %{
          tournament: tournament,
          match: new_match
        })

        tournament
      end

      def game_over_match(tournament, params) do
        Tournament.Matches.update_match(tournament, params.match_id, %{state: "game_over"})
        match = Tournament.Matches.get_match(tournament, params.match_id)

        Codebattle.PubSub.broadcast("tournament:match:upserted", %{
          tournament: tournament,
          match: match
        })

        tournament
      end

      def remove_pass_code(%{meta: %{game_passwords: passwords}} = tournament, %{pass_code: pass_code}) do
        if pass_code in passwords do
          update_in(tournament.meta.game_passwords, fn codes ->
            List.delete(codes, pass_code)
          end)
        else
          tournament
        end
      end

      def remove_pass_code(tournament, _params) do
        tournament
      end

      def maybe_finish_round_after_finish_match(tournament) do
        if finish_round_after_match?(tournament) do
          finish_round_and_next_step(tournament)
        else
          tournament
        end
      end

      def finish_round(tournament) do
        finish_all_playing_matches(tournament)

        tournament
        |> maybe_pause_waiting_room()
        |> set_ranking()
        |> finish_round_and_next_step()
      end

      def finish_round_and_next_step(tournament) do
        tournament
        |> update_struct(%{
          last_round_ended_at: NaiveDateTime.utc_now(:second),
          show_results: need_show_results?(tournament)
        })
        |> calculate_round_results()
        |> Tournament.TournamentResult.upsert_results()
        |> broadcast_round_finished()
        |> maybe_finish_tournament()
        |> update_players_state_after_round_finished()
        |> maybe_start_round_or_break_or_finish()
        |> then(fn tournament ->
          broadcast_tournament_update(tournament)
          tournament
        end)
      end

      def start_rematch(tournament, match_ref) do
        finished_match = get_match(tournament, match_ref)
        new_match_id = matches_count(tournament)
        players = get_players(tournament, finished_match.player_ids)

        case create_rematch_game(tournament, players, new_match_id) do
          nil ->
            # TODO: send message that there is no tasks in task_pack
            nil

          game ->
            build_and_run_match(tournament, players, game, false)
        end

        tournament
      end

      def start_round_games(tournament, match_ref) do
        finished_match = get_match(tournament, match_ref)
        matches = get_round_matches(tournament, tournament.current_round_position)

        task_index = round(2 * Enum.count(matches) / players_count(tournament))

        task_id = Enum.at(tournament.round_task_ids, task_index)

        if task_id do
          build_round_matches(tournament, %{task_id: task_id})
        end

        tournament
      end

      defp pick_game_winner_id(player_ids, player_results) do
        Enum.find(player_ids, &(player_results[&1] && player_results[&1].result == "won"))
      end

      defp maybe_start_round_or_break_or_finish(%{state: "finished"} = tournament) do
        tournament
      end

      defp maybe_start_round_or_break_or_finish(%{use_infinite_break: true} = tournament) do
        update_struct(tournament, %{break_state: "on"})
      end

      defp maybe_start_round_or_break_or_finish(
             %{state: "active", break_duration_seconds: break_duration_seconds} = tournament
           )
           when break_duration_seconds not in [nil, 0] do
        Process.send_after(
          self(),
          {:stop_round_break, tournament.current_round_position},
          to_timeout(second: tournament.break_duration_seconds)
        )

        update_struct(tournament, %{break_state: "on"})
      end

      defp maybe_start_round_or_break_or_finish(tournament) do
        start_round_force(tournament)
      end

      defp increment_current_round(tournament) do
        update_struct(tournament, %{
          current_round_position: tournament.current_round_position + 1
        })
      end

      defp start_round(tournament, round_params \\ %{}) do
        tournament
        |> update_struct(%{
          break_state: "off",
          last_round_started_at: NaiveDateTime.utc_now(:second),
          match_timeout_seconds: Map.get(round_params, :timeout_seconds, tournament.match_timeout_seconds)
        })
        |> build_and_save_round!()
        |> maybe_preload_tasks()
        |> maybe_set_round_task_ids()
        |> maybe_start_round_timer()
        |> maybe_activate_players()
        |> build_round_matches(round_params)
        |> db_save!()
        |> maybe_start_waiting_room()
        |> broadcast_round_created()
      end

      defp maybe_start_waiting_room(%{waiting_room_name: nil} = tournament) do
        tournament
      end

      defp maybe_start_waiting_room(tournament) do
        %{
          tournament
          | waiting_room_state: %{
              tournament.waiting_room_state
              | state: "active"
            }
        }
      end

      defp maybe_set_round_task_ids(%{task_provider: "task_pack", current_round_position: 0} = tournament) do
        update_struct(tournament, %{
          round_task_ids: get_round_task_ids(tournament, 0)
        })
      end

      defp maybe_set_round_task_ids(%{task_provider: "task_pack_per_round"} = tournament) do
        update_struct(tournament, %{
          round_task_ids: get_round_task_ids(tournament, tournament.current_round_position)
        })
      end

      defp maybe_set_round_task_ids(%{current_round_position: 0} = tournament) do
        update_struct(tournament, %{round_task_ids: get_all_task_ids(tournament)})
      end

      defp maybe_set_round_task_ids(tournament), do: tournament

      defp build_round_matches(tournament, round_params) do
        tournament
        |> build_round_pairs()
        |> bulk_insert_round_games(round_params)
      end

      defp bulk_insert_round_games({tournament, player_pairs}, round_params) do
        task_id = get_task_id_by_params(round_params)

        player_pairs
        |> Enum.with_index(matches_count(tournament))
        |> Enum.chunk_every(50)
        |> Enum.each(&bulk_create_round_games_and_matches(&1, tournament, task_id))

        tournament
      end

      defp bulk_create_round_games_and_matches(batch, tournament, task_id) do
        reset_task_ids = tournament.task_provider == "task_pack_per_round"

        batch
        |> Enum.map(fn
          # TODO: skip bots game
          # {[p1 = %{is_bot: true}, p2 = %{is_bot: true}], match_id} ->
          #   Tournament.Matches.put_match(tournament, %Tournament.Match{
          #     id: match_id,
          #     state: "canceled",
          #     round_id: tournament.current_round_id,
          #     round_position: tournament.current_round_position,
          #     player_ids: Enum.sort([p1.id, p2.id])
          #   })

          {[p1, p2] = players, match_id} ->
            %{
              players: players,
              ref: match_id,
              round_id: tournament.current_round_id,
              state: "playing",
              task: get_task(tournament, task_id),
              waiting_room_name: tournament.waiting_room_name,
              timeout_seconds: get_game_timeout(tournament),
              tournament_id: tournament.id,
              type: game_type(),
              use_chat: tournament.use_chat,
              use_timer: tournament.use_timer
            }
            |> maybe_set_free_task(tournament, p1)
            |> maybe_add_award(tournament)
        end)
        |> Game.Context.bulk_create_games()
        |> Enum.zip(batch)
        |> Enum.each(fn {game, {players, _match_id}} ->
          build_and_run_match(tournament, players, game, reset_task_ids)
        end)
      end

      defp create_rematch_game(tournament, players, ref) do
        completed_task_ids = Enum.flat_map(players, & &1.task_ids)

        case get_rematch_task(tournament, completed_task_ids) do
          nil ->
            # no more tasks in round tasks, waiting next round
            nil

          task ->
            {:ok, game} =
              %{
                level: task.level,
                players: players,
                ref: ref,
                round_id: tournament.current_round_id,
                state: "playing",
                task: task,
                timeout_seconds: get_game_timeout(tournament),
                waiting_room_name: tournament.waiting_room_name,
                tournament_id: tournament.id,
                type: game_type(),
                use_chat: tournament.use_chat,
                use_timer: tournament.use_timer
              }
              |> maybe_add_award(tournament)
              |> Game.Context.create_game()

            game
        end
      end

      defp build_and_run_match(tournament, players, game, reset_task_ids) do
        match = %Tournament.Match{
          game_id: game.id,
          task_id: game.task_id,
          id: game.ref,
          level: game.level,
          player_ids: players |> Enum.map(& &1.id) |> Enum.sort(),
          round_id: tournament.current_round_id,
          round_position: tournament.current_round_position,
          started_at: TimeHelper.utc_now(),
          state: "playing"
        }

        Tournament.Matches.put_match(tournament, match)

        Enum.each(players, fn player ->
          Tournament.Players.put_player(tournament, %{
            player
            | matches_ids: [match.id | player.matches_ids],
              task_ids: if(reset_task_ids, do: [game.task_id], else: [game.task_id | player.task_ids])
          })
        end)

        Codebattle.PubSub.broadcast("tournament:match:created", %{
          tournament: tournament,
          match: match
        })
      end

      def update_struct(tournament, params) do
        Map.merge(tournament, params)
      end

      def db_save!(tournament, type \\ nil), do: Tournament.Context.upsert!(tournament, type)

      def build_and_save_round!(tournament) do
        round =
          tournament
          |> Context.build()
          |> Context.upsert!()

        update_struct(tournament, %{
          current_round_id: round.id
        })
      end

      def create_games_for_waiting_room_pairs(tournament, pairs, matched_with_bot) do
        pairs
        |> List.flatten()
        |> Kernel.++(matched_with_bot)
        |> then(&Tournament.Players.get_players(tournament, &1))
        |> Enum.each(&Tournament.Players.put_player(tournament, %{&1 | state: "active"}))

        matched_with_bot
        |> Enum.map(&List.wrap/1)
        |> Enum.concat(pairs)
        |> Enum.chunk_every(100)
        |> Enum.each(&create_games_for_waiting_room_batch(tournament, &1))

        tournament
      end

      defp create_games_for_waiting_room_batch(tournament, pairs) do
        pairs
        |> Enum.map(fn
          [id1, id2] = ids ->
            players = get_players(tournament, ids)
            completed_task_ids = Enum.flat_map(players, & &1.task_ids)

            {players, get_rematch_task(tournament, completed_task_ids)}

          [id] ->
            player = get_player(tournament, id)
            opponent_bot = Tournament.Player.new!(Bot.Context.build())
            {[player, opponent_bot], get_rematch_task(tournament, player.task_ids)}
        end)
        |> Enum.split_with(fn {player, task_id} -> is_nil(task_id) end)
        |> then(fn {_finished_round_players, players_to_play} ->
          # TODO: We filtered players that solved all round tasks before WR,
          # but if they appear here, we just ignore them.
          players_to_play
          |> Enum.with_index(matches_count(tournament))
          |> Enum.map(fn {{players, task}, match_id} ->
            %{
              players: players,
              ref: match_id,
              round_id: tournament.current_round_id,
              state: "playing",
              task: task,
              timeout_seconds: get_game_timeout(tournament),
              tournament_id: tournament.id,
              type: game_type(),
              use_chat: tournament.use_chat,
              use_timer: tournament.use_timer,
              waiting_room_name: tournament.waiting_room_name
            }
          end)
          |> Game.Context.bulk_create_games()
          |> Enum.zip(players_to_play)
          |> Enum.each(fn {game, {players, _task}} ->
            build_and_run_match(tournament, players, game, false)
          end)
        end)
      end

      defp maybe_finish_tournament(tournament) do
        if finish_tournament?(tournament) do
          tournament
          |> update_struct(%{state: "finished", finished_at: TimeHelper.utc_now()})
          |> maybe_finish_waiting_room()
          |> set_stats()
          |> set_winner_ids()
          # |> db_save!()
          |> maybe_save_event_results()
          |> db_save!(:with_ets)
          |> broadcast_tournament_finished()
          |> then(fn tournament ->
            Process.send_after(self(), :terminate, to_timeout(minute: 15))

            tournament
          end)
        else
          tournament
        end
      end

      defp update_players_state_after_round_finished(%{type: "arena", state: "finished"} = tournament) do
        tournament
        |> get_players()
        |> Enum.each(fn player ->
          if player.state not in ["banned", "finished"] do
            %{player | state: "finished"}
            |> then(&Tournament.Players.put_player(tournament, &1))
            |> then(
              &Codebattle.PubSub.broadcast("tournament:player:finished", %{
                tournament: tournament,
                player: &1
              })
            )
          end
        end)

        tournament
      end

      defp update_players_state_after_round_finished(%{type: "arena"} = tournament) do
        tournament
        |> get_players()
        |> Enum.each(fn player ->
          if player.state not in ["banned", "matchmaking_paused", "finished_round"] do
            %{player | state: "finished_round"}
            |> then(&Tournament.Players.put_player(tournament, &1))
            |> then(
              &Codebattle.PubSub.broadcast("tournament:player:finished_round", %{
                tournament: tournament,
                player: &1
              })
            )
          end
        end)

        tournament
      end

      defp update_players_state_after_round_finished(t), do: t

      defp set_stats(tournament) do
        update_struct(tournament, %{stats: get_stats(tournament)})
      end

      defp set_winner_ids(tournament) do
        update_struct(tournament, %{winner_ids: get_winner_ids(tournament)})
      end

      defp maybe_start_round_timer(%{round_timeout_seconds: nil} = tournament), do: tournament

      defp maybe_start_round_timer(tournament) do
        Process.send_after(
          self(),
          {:finish_round_force, tournament.current_round_position},
          to_timeout(second: tournament.round_timeout_seconds)
        )

        tournament
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
        Codebattle.PubSub.broadcast("tournament:finished", %{tournament: tournament})
        tournament
      end

      defp get_game_timeout(tournament) do
        if use_waiting_room?(tournament) or tournament.type in ["squad", "swiss"] do
          min(seconds_to_end_round(tournament), tournament.match_timeout_seconds)
        else
          get_round_timeout_seconds(tournament)
        end
      end

      defp seconds_to_end_round(tournament) do
        max(
          get_round_timeout_seconds(tournament) -
            NaiveDateTime.diff(NaiveDateTime.utc_now(), tournament.last_round_started_at),
          0
        )
      end

      defp get_round_timeout_seconds(tournament) do
        tournament.round_timeout_seconds || tournament.match_timeout_seconds
      end

      defp use_waiting_room?(%{waiting_room_name: wrn}) when not is_nil(wrn), do: true
      defp use_waiting_room?(_), do: false

      defp broadcast_tournament_update(tournament) do
        Codebattle.PubSub.broadcast("tournament:updated", %{tournament: tournament})
      end

      defp maybe_preload_tasks(%{current_round_position: 0} = tournament) do
        Tournament.Tasks.put_tasks(tournament, get_all_tasks(tournament))

        tournament
      end

      defp maybe_preload_tasks(tournament), do: tournament

      # defp need_show_results?(tournament = %{type: "arena"}), do: !finish_tournament?(tournament)
      # defp need_show_results?(tournament = %{type: "swiss"}), do: !finish_tournament?(tournament)
      defp need_show_results?(tournament), do: true

      defp get_score("time_and_tests", level, result_percent, duration_sec) do
        Score.TimeAndTests.get_score(level, result_percent, duration_sec)
      end

      defp get_score("win_loss", level, player_result, _duration_sec) do
        Score.WinLoss.get_score(level, player_result)
      end

      defp get_score("one_zero", level, player_result, _duration_sec) do
        Score.OneZero.get_score(level, player_result)
      end

      defp get_task_id_by_params(%{task_id: task_id}), do: task_id
      defp get_task_id_by_params(_round_params), do: nil

      defp player_finished_round?(tournament, player) do
        Enum.count(player.task_ids) == Enum.count(tournament.round_task_ids)
      end

      defp finish_all_playing_matches(tournament) do
        matches_to_finish = get_matches(tournament, "playing")
        finished_at = TimeHelper.utc_now()

        Enum.each(
          matches_to_finish,
          fn match ->
            duration_sec = NaiveDateTime.diff(match.started_at, finished_at)

            player_results = improve_player_results(tournament, match, duration_sec)
            Game.Context.trigger_timeout(match.game_id)

            new_match = %{
              match
              | state: "timeout",
                player_results: player_results,
                duration_sec: duration_sec,
                finished_at: finished_at
            }

            Tournament.Matches.put_match(tournament, new_match)

            Codebattle.PubSub.broadcast("tournament:match:upserted", %{
              tournament: tournament,
              match: new_match
            })

            player_results
            |> Map.keys()
            |> Enum.each(fn player_id ->
              player = Tournament.Players.get_player(tournament, player_id)

              Tournament.Players.put_player(tournament, %{
                player
                | score: player.score + player_results[player_id].score,
                  lang: player_results[player_id].lang
              })
            end)
          end
        )
      end

      defp improve_player_results(tournament, match, duration_sec) do
        case Game.Context.fetch_game(match.game_id) do
          {:ok, %{is_live: true} = game} ->
            game
            |> Game.Helpers.get_player_results()
            |> Map.new(fn {player_id, result} ->
              {player_id,
               Map.put(
                 result,
                 :score,
                 get_score(
                   tournament.score_strategy,
                   match.level,
                   result.result_percent,
                   duration_sec
                 )
               )}
            end)

          {:error, _reason} ->
            %{}
        end
      end

      defp maybe_add_award(game_params, tournament) do
        tournament.meta
        |> Map.get(:rounds_config)
        |> case do
          nil ->
            Map.put(game_params, :award, nil)

          config ->
            config
            |> Enum.at(tournament.current_round_position)
            |> case do
              %{award: award} ->
                Map.put(game_params, :award, award)

              _ ->
                Map.put(game_params, :award, nil)
            end
        end
      end

      defp maybe_set_free_task(game_params, %Tournament{type: "show", task_strategy: "sequential"} = tournament, player) do
        task_id = Enum.at(tournament.round_task_ids, Enum.count(player.task_ids))

        Map.put(game_params, :task_id, task_id)
        Map.put(game_params, :task, get_task(tournament, task_id))
      end

      defp maybe_set_free_task(game_params, _tournament, _player) do
        game_params
      end

      defp maybe_save_event_results(%{use_clan: true, event_id: event_id} = tournament) when not is_nil(event_id) do
        Event.EventClanResult.save_results(tournament)
        Event.EventResult.save_results(tournament)
        tournament
      end

      defp maybe_save_event_results(%{event_id: event_id} = tournament) when not is_nil(event_id) do
        Event.EventResult.save_results(tournament)
        tournament
      end

      defp maybe_save_event_results(t), do: t

      defp maybe_activate_players(%{current_round_position: 0} = t), do: t

      defp maybe_activate_players(%{type: "arena"} = tournament) do
        tournament
        |> get_players()
        |> Enum.each(fn player ->
          if player.state not in ["active", "banned", "finished"] do
            Tournament.Players.put_player(tournament, %{player | state: "active"})
          end
        end)

        tournament
      end

      defp maybe_activate_players(t), do: t

      defp maybe_pause_waiting_room(%{waiting_room_name: nil} = t), do: t

      defp maybe_pause_waiting_room(tournament) do
        %{
          tournament
          | waiting_room_state: %{
              tournament.waiting_room_state
              | state: "paused"
            }
        }
      end

      defp maybe_finish_waiting_room(%{waiting_room_name: nil} = t), do: t

      defp maybe_finish_waiting_room(tournament) do
        %{
          tournament
          | waiting_room_state: %{
              tournament.waiting_room_state
              | state: "finished"
            }
        }
      end
    end
  end
end
