# credo:disable-for-this-file
defmodule Codebattle.Tournament.Context do
  @moduledoc false
  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.Game
  alias Codebattle.Game.Helpers
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Round
  alias Codebattle.User
  alias Codebattle.UserGameReport
  alias Runner.AtomizedMap

  @type tournament_id :: pos_integer() | String.t()
  @type event_id :: pos_integer() | String.t()

  @states_from_restore ["waiting_participants", "active"]

  def get_user_latest_game_id(tournament, user_id) do
    tournament
    |> Tournament.Helpers.get_player_latest_match(user_id)
    |> case do
      %{game_id: game_id} -> game_id
      _ -> nil
    end
  end

  @spec get_tournament_info(tournament_id()) :: Tournament.t() | map()
  def get_tournament_info(tournament_id) do
    case Tournament.Server.get_tournament_info(tournament_id) do
      nil -> get_from_db!(tournament_id)
      tournament_info -> tournament_info
    end
  end

  @spec get!(tournament_id()) :: Tournament.t() | no_return()
  def get!(id) do
    case Tournament.Server.get_tournament(id) do
      nil -> get_from_db!(id)
      tournament -> tournament
    end
  end

  @spec get(tournament_id()) :: Tournament.t() | nil
  def get(id) do
    get!(id)
  rescue
    Ecto.NoResultsError ->
      nil
  end

  @spec get_from_db!(tournament_id()) :: Tournament.t() | no_return()
  def get_from_db!(id) do
    Tournament
    |> Repo.get!(id)
    |> Repo.preload([:creator])
    |> add_module()
  end

  @spec check_pass_code(tournament_id(), String.t()) :: boolean()
  def check_pass_code(id, pass_code) do
    case get(id) do
      %{meta: %{game_passwords: passwords}} -> pass_code in passwords
      _ -> false
    end
  end

  @spec remove_pass_code(tournament_id(), String.t()) :: :ok | {:error, term()}
  def remove_pass_code(id, pass_code) do
    Tournament.Server.handle_event(id, :remove_pass_code, %{pass_code: pass_code})
  end

  @spec get_from_db(tournament_id()) :: Tournament.t() | nil
  def get_from_db(id) do
    get_from_db!(id)
  rescue
    Ecto.NoResultsError ->
      nil
  end

  @spec list_live_and_finished(User.t()) :: list(Tournament.t())
  def list_live_and_finished(user) do
    (get_live_tournaments() ++ get_db_tournaments(["finished"]))
    |> Enum.filter(fn tournament ->
      Tournament.Helpers.can_access?(tournament, user, %{})
    end)
    |> Enum.uniq_by(& &1.id)
    |> Enum.sort_by(& &1.id, :desc)
  end

  @spec get_db_tournaments(nonempty_list(String.t())) :: list(Tournament.t())
  def get_db_tournaments(states) do
    Repo.all(
      from(t in Tournament,
        order_by: [desc: t.id],
        where: t.state in ^states,
        limit: 15,
        preload: [:creator]
      )
    )
  end

  @spec get_all_by_event_id!(event_id()) :: Event.t() | no_return()
  def get_all_by_event_id!(event_id) do
    Repo.all(
      from(t in Tournament,
        order_by: t.starts_at,
        where: t.event_id == ^event_id and t.state in ["waiting_participants", "active", "finished"]
      )
    )
  end

  @spec get_upcoming_to_live_candidate(non_neg_integer()) :: Tournament.t() | nil
  def get_upcoming_to_live_candidate(starts_at_delay_mins) do
    now = DateTime.utc_now()
    delay_time = DateTime.add(now, starts_at_delay_mins, :minute)

    Repo.one(
      from(t in Tournament,
        limit: 1,
        order_by: t.id,
        where:
          t.state == "upcoming" and
            t.grade != "open" and
            t.starts_at >= ^now and
            t.starts_at <= ^delay_time
      )
    )
  end

  @spec get_season_tournaments(%{
          from: DateTime.t(),
          to: DateTime.t(),
          user: User.t() | nil
        }) :: list(Tournament.t())
  def get_season_tournaments(filter) do
    %{from: datetime_from, to: datetime_to} = filter

    Repo.all(
      from(t in Tournament,
        order_by: t.id,
        where:
          t.starts_at >= ^datetime_from and
            t.starts_at <= ^datetime_to and
            t.grade != "open"
      )
    )
  end

  @spec get_one_upcoming_tournament_for_each_grade() :: list(Tournament.t())
  def get_one_upcoming_tournament_for_each_grade do
    cte_query =
      from(t in Tournament,
        where: t.state == "upcoming" and t.grade != "open" and t.starts_at > ^DateTime.utc_now(),
        group_by: t.grade,
        select: %{grade: t.grade, min_id: min(t.id)}
      )

    Repo.all(
      from(t in Tournament,
        join: cte in subquery(cte_query),
        on: t.grade == cte.grade and t.id == cte.min_id,
        where: t.state == "upcoming" and t.grade != "open",
        order_by: [t.grade, t.starts_at]
      )
    )
  end

  @spec get_user_tournaments(%{
          from: DateTime.t(),
          to: DateTime.t(),
          user: User.t() | nil
        }) :: list(Tournament.t())
  def get_user_tournaments(%{user: %{is_guest: true}}), do: []

  def get_user_tournaments(filter) do
    %{from: datetime_from, to: datetime_to, user: %{id: user_id} = user} = filter

    if User.admin_or_moderator?(user) do
      Repo.all(
        from(t in Tournament,
          order_by: t.id,
          where:
            t.starts_at >= ^datetime_from and t.starts_at <= ^datetime_to and
              t.state != "upcoming"
        )
      )
    else
      Repo.all(
        from(t in Tournament,
          order_by: t.id,
          where:
            t.starts_at >= ^datetime_from and
              t.starts_at <= ^datetime_to and
              (t.creator_id == ^user_id or
                 fragment("? = ANY(?)", ^user_id, t.winner_ids) or
                 fragment("? = ANY(?)", ^user_id, t.moderator_ids))
        )
      )
    end
  end

  @spec get_live_tournaments_for_user(User.t()) :: list(Tournament.t())
  def get_live_tournaments_for_user(user) do
    get_live_tournaments()
    |> Enum.filter(fn tournament ->
      tournament.grade != "open" ||
        Tournament.Helpers.can_access?(tournament, user, %{})
    end)
    |> Enum.uniq_by(& &1.id)
    |> Enum.sort_by(& &1.id, :desc)
  end

  @spec get_live_tournaments() :: list(Tournament.t())
  def get_live_tournaments do
    Tournament.GlobalSupervisor
    |> Supervisor.which_children()
    |> Enum.filter(fn
      {_, :undefined, _, _} -> false
      {_, _pid, _, _} -> true
    end)
    |> Enum.map(fn {id, _, _, _} -> Tournament.Context.get(id) end)
    |> Enum.filter(fn
      nil -> false
      tournament -> tournament.state in ["waiting_participants", "active", "finished"]
    end)
  end

  @spec get_live_tournaments_count() :: non_neg_integer()
  def get_live_tournaments_count, do: Enum.count(get_live_tournaments())

  @spec validate(map(), Tournament.t()) :: Ecto.Changeset.t()
  def validate(params, tournament \\ %Tournament{}) do
    tournament
    |> Tournament.changeset(prepare_tournament_params(params))
    |> Map.put(:action, :validate)
  end

  @spec create(map()) :: {:ok, Tournament.t()} | {:error, Ecto.Changeset.t()}
  def create(params) do
    if Codebattle.Deployment.draining?() do
      {:error, :draining}
    else
      changeset = Tournament.changeset(%Tournament{}, prepare_tournament_params(params))

      changeset
      |> Repo.insert()
      |> case do
        {:ok, tournament} ->
          {:ok, _pid} =
            tournament
            |> add_module()
            |> mark_as_live()
            |> Tournament.GlobalSupervisor.start_tournament()

          Codebattle.PubSub.broadcast("tournament:created", %{tournament: tournament})

          {:ok, tournament}

        {:error, changeset} ->
          {:error, changeset}
      end
    end
  end

  @duplicated_fields [
    :access_type,
    :auto_redirect_to_game,
    :break_duration_seconds,
    :break_state,
    :description,
    :event_id,
    :exclude_banned_players,
    :grade,
    :group_tournament_id,
    :labels,
    :level,
    :match_timeout_seconds,
    :moderator_ids,
    :players_limit,
    :ranking_type,
    :round_timeout_seconds,
    :rounds_limit,
    :score_strategy,
    :show_results,
    :task_pack_name,
    :task_provider,
    :task_strategy,
    :timeout_mode,
    :tournament_timeout_seconds,
    :type,
    :use_chat,
    :use_clan,
    :use_event_ranking,
    :use_infinite_break,
    :use_timer
  ]

  @spec duplicate(Tournament.t(), User.t(), pos_integer()) ::
          {:ok, [Tournament.t()]} | {:error, term()}
  def duplicate(%Tournament{} = tournament, creator, count \\ 1) do
    base_params =
      tournament
      |> Map.take(@duplicated_fields)
      |> Map.put(:creator, creator)
      |> Map.put(:starts_at, tournament.starts_at)

    results =
      Enum.map(1..count, fn index ->
        params =
          base_params
          |> Map.put(:name, "#{tournament.name} ##{index}")
          |> maybe_generate_access_token()

        changeset = Tournament.changeset(%Tournament{}, params)

        changeset
        |> Repo.insert()
        |> case do
          {:ok, new_tournament} ->
            {:ok, _pid} =
              new_tournament
              |> add_module()
              |> mark_as_live()
              |> Tournament.GlobalSupervisor.start_tournament()

            Codebattle.PubSub.broadcast("tournament:created", %{tournament: new_tournament})

            {:ok, new_tournament}

          {:error, changeset} ->
            {:error, changeset}
        end
      end)

    errors = Enum.filter(results, &match?({:error, _}, &1))

    if Enum.empty?(errors) do
      {:ok, Enum.map(results, fn {:ok, t} -> t end)}
    else
      {:error, errors}
    end
  end

  defp maybe_generate_access_token(%{access_type: "token"} = params) do
    Map.put(params, :access_token, generate_access_token())
  end

  defp maybe_generate_access_token(params), do: params

  @spec handle_event(Tournament.t() | tournament_id(), atom(), map()) ::
          Tournament.t() | {:error, :not_found | :handoff_in_progress}
  def handle_event(%Tournament{id: id}, event_type, params) do
    handle_event(id, event_type, params)
  end

  def handle_event(tournament_id, event_type, params) do
    Tournament.Server.handle_event(tournament_id, event_type, params)
  end

  def recalculate_results(tournament_id) do
    case Tournament.Server.get_tournament(tournament_id) do
      nil ->
        tournament_id
        |> get_from_db!()
        |> add_module()
        |> rebuild_finished_results_from_db()

      _tournament ->
        Tournament.Server.handle_event(tournament_id, :recalculate_results, %{})
    end
  end

  @spec get_live_tournament_players(Tournament.t()) :: [Tournament.Player.t()]
  def get_live_tournament_players(tournament) do
    Tournament.Players.get_players(tournament)
  end

  @spec update(Tournament.t(), map()) :: {:ok, Tournament.t()} | {:error, Ecto.Changeset.t()}
  def update(tournament, params) do
    params = Map.put_new(params, "creator_id", tournament.creator_id)

    tournament
    |> Tournament.changeset(prepare_tournament_params(params))
    |> Repo.update()
    |> case do
      {:ok, tournament} ->
        Tournament.Server.update_tournament(tournament)
        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @spec upsert!(Tournament.t(), nil | :with_ets) :: Tournament.t()
  def upsert!(tournament, type \\ nil)

  def upsert!(tournament, nil) do
    tournament
    |> Map.put(:updated_at, TimeHelper.utc_now())
    |> Repo.insert!(
      conflict_target: :id,
      on_conflict: {:replace_all_except, [:id, :inserted_at]}
    )
  end

  def upsert!(tournament, :with_ets) do
    players =
      tournament |> Tournament.Players.get_players() |> Map.new(&{&1.id, &1})

    matches =
      tournament |> Tournament.Matches.get_matches() |> Map.new(&{&1.id, &1})

    tournament
    |> Map.put(:updated_at, TimeHelper.utc_now())
    |> Map.put(:players, players)
    |> Map.put(:matches, matches)
    |> Repo.insert!(
      conflict_target: :id,
      on_conflict: {:replace_all_except, [:id, :inserted_at]}
    )
  end

  @spec restart(Tournament.t()) :: :ok
  def restart(tournament) do
    tournament_info = Tournament.Server.get_tournament_info(tournament.id)

    tournament
    |> Tournament.Helpers.get_matches("playing")
    |> Enum.each(&Game.Context.terminate_game(&1.game_id))

    :timer.sleep(59)

    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
    drop_tournament_tables(tournament_info)
    clear_tournament_info_cache(tournament.id)
    Tournament.GlobalSupervisor.start_tournament(tournament)
    Codebattle.PubSub.broadcast("tournament:restarted", %{tournament: tournament})
    :ok
  end

  @spec retry(Tournament.t()) :: :ok
  def retry(tournament) do
    tournament_info = Tournament.Server.get_tournament_info(tournament.id)

    Game.Context.terminate_tournament_games(tournament.id)

    :timer.sleep(59)

    Tournament.GlobalSupervisor.terminate_tournament(tournament.id)
    drop_tournament_tables(tournament_info)
    clear_tournament_info_cache(tournament.id)
    clear_tournament_history(tournament.id)
    Tournament.GlobalSupervisor.start_tournament(tournament)
    Codebattle.PubSub.broadcast("tournament:restarted", %{tournament: tournament})
    :ok
  end

  @spec move_upcoming_to_live(Tournament.t()) :: :ok
  def move_upcoming_to_live(tournament) do
    tournament =
      tournament
      |> Tournament.changeset(%{state: "waiting_participants"})
      |> Repo.update!()

    :timer.sleep(100)

    Tournament.GlobalSupervisor.start_tournament(tournament)
    Codebattle.PubSub.broadcast("tournament:activated", %{tournament: tournament})
    :ok
  end

  defp clear_tournament_info_cache(tournament_id) do
    if :ets.whereis(:tournament_info_cache) != :undefined do
      :ets.delete(:tournament_info_cache, tournament_id)
    end

    :ok
  rescue
    _e -> :ok
  end

  defp drop_tournament_tables(nil), do: :ok

  defp drop_tournament_tables(tournament_info) do
    Enum.each([:players_table, :matches_table, :tasks_table, :ranking_table, :clans_table], fn key ->
      case Map.get(tournament_info, key) do
        nil ->
          :ok

        table ->
          safe_delete_tournament_table(table)
      end
    end)
  rescue
    _e -> :ok
  end

  defp safe_delete_tournament_table(table) do
    :ets.delete(table)
  catch
    :error, :badarg -> :ok
  end

  defp prepare_tournament_params(params) do
    params =
      params
      |> Map.delete("creator")
      |> AtomizedMap.atomize()
      |> Map.put(:creator, params["creator"] || %{})
      |> normalize_moderator_ids()

    timeout_mode =
      params[:timeout_mode] ||
        cond do
          params[:tournament_timeout_seconds] not in [nil, ""] -> "per_tournament"
          params[:round_timeout_seconds] not in [nil, ""] -> "per_round_fixed"
          true -> "per_task"
        end

    params =
      case timeout_mode do
        "per_task" ->
          params
          |> Map.put(:round_timeout_seconds, nil)
          |> Map.put(:tournament_timeout_seconds, nil)

        mode when mode in ["per_round_fixed", "per_round_with_rematch"] ->
          Map.put(params, :tournament_timeout_seconds, nil)

        "per_tournament" ->
          Map.put(params, :round_timeout_seconds, nil)

        # Pass through unknown modes — changeset validation will reject them
        _ ->
          params
      end

    cond_result =
      if params[:starts_at] do
        params[:starts_at] <> ":00"
      else
        NaiveDateTime.utc_now()
        |> NaiveDateTime.add(60 * 60, :second)
        |> NaiveDateTime.to_iso8601()
      end

    starts_at =
      cond_result
      |> NaiveDateTime.from_iso8601!()
      |> DateTime.from_naive!(params[:user_timezone] || "Etc/UTC")

    match_timeout_seconds = params[:match_timeout_seconds] || "180"

    access_token =
      case params[:access_type] do
        "token" -> generate_access_token()
        _ -> nil
      end

    show_results = if is_nil(params[:show_results]), do: true, else: params[:show_results]

    Map.merge(params, %{
      access_token: access_token,
      match_timeout_seconds: match_timeout_seconds,
      timeout_mode: timeout_mode,
      starts_at: starts_at,
      meta: %{},
      show_results: show_results
    })
  end

  defp normalize_moderator_ids(%{moderator_ids: moderator_ids} = params) do
    creator_id =
      params
      |> Map.get(:creator)
      |> case do
        nil -> Map.get(params, :creator_id)
        creator -> Map.get(creator, :id) || Map.get(params, :creator_id)
      end

    normalized_moderator_ids =
      moderator_ids
      |> List.wrap()
      |> Enum.map(fn
        id when is_integer(id) -> id
        id when is_binary(id) -> String.trim(id)
        _ -> nil
      end)
      |> Enum.reject(&is_nil/1)
      |> Enum.reject(&(&1 == ""))
      |> Enum.map(fn
        id when is_integer(id) ->
          id

        id when is_binary(id) ->
          case Integer.parse(id) do
            {parsed_id, ""} -> parsed_id
            _ -> nil
          end
      end)
      |> Enum.reject(&is_nil/1)
      |> Enum.reject(&(&1 == creator_id))
      |> Enum.uniq()

    Map.put(params, :moderator_ids, normalized_moderator_ids)
  end

  defp normalize_moderator_ids(params), do: params

  def get_tournament_for_restore do
    @states_from_restore
    |> get_db_tournaments()
    |> Enum.map(fn tournament ->
      tournament
      |> add_module()
      |> mark_as_live()
    end)
  end

  def restore_live_tournaments do
    Enum.each(get_tournament_for_restore(), &restore_after_release/1)
  end

  def restore_after_release(%Tournament{} = tournament) do
    with :ok <- ensure_tournament_started(tournament) do
      case tournament.state do
        "waiting_participants" ->
          restore_waiting_participants_tournament(tournament)

        "active" ->
          restore_active_tournament(tournament)

        _ ->
          :ok
      end
    end
  end

  defp clear_tournament_history(tournament_id) do
    Repo.delete_all(from(ugr in UserGameReport, where: ugr.tournament_id == ^tournament_id))
    Tournament.TournamentResult.clean_results(tournament_id)
    Tournament.TournamentUserResult.clean_results(tournament_id)
    Repo.delete_all(from(g in Game, where: g.tournament_id == ^tournament_id))
    Repo.delete_all(from(r in Round, where: r.tournament_id == ^tournament_id))
  end

  def mark_as_live(tournament), do: Map.put(tournament, :is_live, true)

  defp get_module(%{type: "top200"}), do: Tournament.Top200
  defp get_module(%{type: "individual"}), do: Tournament.Individual
  defp get_module(%{type: "show"}), do: Tournament.Show
  defp get_module(%{type: "swiss"}), do: Tournament.Swiss
  defp get_module(%{type: "versus"}), do: Tournament.Versus

  defp add_module(tournament), do: Map.put(tournament, :module, get_module(tournament))

  defp generate_access_token do
    17 |> :crypto.strong_rand_bytes() |> Base.url_encode64() |> binary_part(0, 17)
  end

  defp ensure_tournament_started(tournament) do
    case Tournament.GlobalSupervisor.start_tournament(tournament) do
      {:ok, _pid} -> :ok
      {:error, {:already_started, _pid}} -> :ok
      {:error, {:already_present, _child}} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp restore_waiting_participants_tournament(tournament) do
    players = build_restore_players(tournament)

    snapshot =
      build_restore_snapshot(
        tournament,
        players,
        [],
        build_waiting_ranking(players)
      )

    :ok = Tournament.Server.import_state(tournament.id, snapshot)
    :ok
  end

  defp restore_active_tournament(tournament) do
    completed_round_position = completed_round_position_for_restore(tournament)
    historical_matches = load_match_history(tournament.id, completed_round_position)
    current_round_blueprints = load_round_blueprints(tournament.id, tournament.current_round_position)
    players = build_restore_players(tournament, historical_matches, current_round_blueprints)

    snapshot =
      build_restore_snapshot(
        tournament,
        players,
        historical_matches,
        []
      )

    :ok = Tournament.Server.import_state(tournament.id, snapshot)
    _ = Round.disable_all_rounds(tournament.id)

    played_pair_ids =
      build_played_pair_ids(players, historical_matches ++ current_round_blueprints)

    params = %{
      completed_round_position: completed_round_position,
      played_pair_ids: played_pair_ids
    }

    if tournament.break_state == "on" do
      restore_active_break(tournament, params)
    else
      restore_active_round(tournament, current_round_blueprints, params)
    end
  end

  defp restore_active_break(tournament, params) do
    :ok = Tournament.Server.handle_event(tournament.id, :restore_active_break, params)

    remaining_break_seconds = remaining_break_seconds(tournament)

    if remaining_break_seconds <= 0 do
      Tournament.Server.handle_event(tournament.id, :start_round_force, %{})
    else
      Tournament.Server.stop_round_break_after(
        tournament.id,
        tournament.current_round_position,
        remaining_break_seconds
      )
    end

    :ok
  end

  defp restore_active_round(tournament, current_round_blueprints, params) do
    cancel_current_round_games(tournament.id, tournament.current_round_position)
    Tournament.TournamentResult.clean_results(tournament.id, tournament.current_round_position)

    _tournament =
      Tournament.Server.handle_event(
        tournament.id,
        :restore_active_round,
        Map.merge(params, %{
          match_blueprints: current_round_blueprints,
          task_id:
            case List.first(current_round_blueprints) do
              %{task_id: task_id} -> task_id
              _ -> nil
            end,
          started_at: tournament.last_round_started_at,
          remaining_timeout_seconds: remaining_round_seconds(tournament)
        })
      )

    :ok
  end

  defp build_restore_snapshot(tournament, players, matches, ranking) do
    human_players_count = Enum.count(players, &(!&1.is_bot))

    %{
      tournament:
        tournament
        |> Map.put(:players_count, human_players_count)
        |> export_restore_tournament(),
      ets: %{
        players: Enum.map(players, &{&1.id, &1.state, &1}),
        matches: Enum.map(matches, &{&1.id, &1.state, &1}),
        tasks: build_restore_tasks_rows(tournament),
        ranking: Enum.map(ranking, &{&1.place, &1.id, &1}),
        clans: [],
        tournament_info_cache: nil
      }
    }
  end

  defp export_restore_tournament(tournament) do
    tournament
    |> Map.from_struct()
    |> Map.drop([
      :__meta__,
      :creator,
      :event,
      :players_table,
      :matches_table,
      :tasks_table,
      :ranking_table,
      :clans_table
    ])
  end

  defp build_restore_players(tournament, historical_matches \\ [], current_round_blueprints \\ []) do
    persisted_players =
      tournament.players
      |> Map.values()
      |> Enum.map(&Tournament.Player.new!/1)

    known_player_ids = MapSet.new(Enum.map(persisted_players, & &1.id))

    bot_ids =
      (historical_matches ++ current_round_blueprints)
      |> Enum.flat_map(& &1.player_ids)
      |> Enum.reject(&MapSet.member?(known_player_ids, &1))
      |> Enum.uniq()

    bots =
      bot_ids
      |> Enum.map(&Codebattle.Bot.Context.get/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Tournament.Player.new!/1)

    Enum.concat(persisted_players, bots)
  end

  defp build_waiting_ranking(players) do
    players
    |> Enum.reject(& &1.is_bot)
    |> Enum.sort_by(fn player -> {player.place || 0, player.wr_joined_at || 0, player.id} end)
    |> Enum.with_index(1)
    |> Enum.map(fn {player, place} ->
      %{
        id: player.id,
        place: place,
        score: 0,
        lang: player.lang,
        name: player.name,
        clan_id: player.clan_id,
        clan: player.clan
      }
    end)
  end

  defp build_restore_tasks_rows(tournament) do
    tournament.task_ids
    |> Codebattle.Task.get_by_ids()
    |> Enum.map(&{&1.id, &1.level, nil, &1})
  end

  defp load_match_history(_tournament_id, round_position) when round_position < 0, do: []

  defp load_match_history(tournament_id, round_position) do
    from(g in Game,
      where: g.tournament_id == ^tournament_id and g.round_position <= ^round_position,
      order_by: [asc: g.round_position, asc: g.ref]
    )
    |> Repo.all()
    |> Enum.map(&build_match_from_game/1)
  end

  defp load_round_blueprints(tournament_id, round_position) do
    from(g in Game,
      where: g.tournament_id == ^tournament_id and g.round_position == ^round_position,
      order_by: [asc: g.ref]
    )
    |> Repo.all()
    |> Enum.map(fn game ->
      %{
        id: game.ref,
        level: game.level,
        player_ids: Enum.sort(game.player_ids),
        task_id: game.task_id
      }
    end)
  end

  defp build_match_from_game(game) do
    winner_id =
      game
      |> Helpers.get_winner()
      |> case do
        %{id: id} -> id
        _ -> nil
      end

    %Tournament.Match{
      duration_sec: game.duration_sec,
      finished_at: game.finishes_at,
      game_id: game.id,
      id: game.ref,
      level: game.level,
      player_ids: Enum.sort(game.player_ids),
      player_results: Helpers.get_player_results(game),
      rematch: false,
      round_id: game.round_id,
      round_position: game.round_position,
      started_at: game.starts_at,
      state: normalize_match_state(game.state),
      task_id: game.task_id,
      winner_id: winner_id
    }
  end

  defp normalize_match_state("game_over"), do: "game_over"
  defp normalize_match_state("timeout"), do: "timeout"
  defp normalize_match_state("canceled"), do: "canceled"
  defp normalize_match_state(_state), do: "canceled"

  defp completed_round_position_for_restore(%{break_state: "on", current_round_position: round_position}),
    do: round_position

  defp completed_round_position_for_restore(%{current_round_position: round_position}), do: round_position - 1

  defp build_played_pair_ids(players, matches_or_blueprints) do
    players_by_id = Map.new(players, &{&1.id, &1})

    Enum.reduce(matches_or_blueprints, MapSet.new(), fn %{player_ids: player_ids}, acc ->
      case Enum.sort(player_ids) do
        [p1, p2] ->
          if human_pair?(players_by_id, p1, p2) do
            MapSet.put(acc, [p1, p2])
          else
            acc
          end

        _ ->
          acc
      end
    end)
  end

  defp human_pair?(players_by_id, p1, p2) do
    case {Map.get(players_by_id, p1), Map.get(players_by_id, p2)} do
      {%{is_bot: false}, %{is_bot: false}} -> true
      _ -> false
    end
  end

  defp remaining_round_seconds(%{timeout_mode: mode}) when mode not in ["per_round_fixed", "per_round_with_rematch"],
    do: nil

  defp remaining_round_seconds(%{last_round_started_at: nil}), do: nil

  defp remaining_round_seconds(tournament) do
    elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(:second), tournament.last_round_started_at)
    max(tournament.round_timeout_seconds - elapsed, 0)
  end

  defp remaining_break_seconds(%{last_round_ended_at: nil}), do: 0

  defp remaining_break_seconds(tournament) do
    elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(:second), tournament.last_round_ended_at)
    max((tournament.break_duration_seconds || 0) - elapsed, 0)
  end

  defp cancel_current_round_games(tournament_id, round_position) do
    now = TimeHelper.utc_now()

    Repo.update_all(
      from(g in Game,
        where: g.tournament_id == ^tournament_id and g.round_position == ^round_position,
        update: [set: [state: "canceled", updated_at: ^now]]
      ),
      []
    )

    :ok
  end

  defp rebuild_finished_results_from_db(%Tournament{state: "finished"} = tournament) do
    Tournament.TournamentResult.clean_results(tournament.id)

    Enum.each(0..tournament.current_round_position, fn round_position ->
      tournament
      |> Map.put(:current_round_position, round_position)
      |> Tournament.TournamentResult.upsert_results()
    end)

    Tournament.TournamentUserResult.clean_results(tournament.id)
    Tournament.TournamentUserResult.upsert_results(tournament)

    tournament
  end

  defp rebuild_finished_results_from_db(tournament), do: tournament
end
