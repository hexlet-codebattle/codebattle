defmodule Codebattle.Tournament.Helpers do
  @moduledoc false
  alias Codebattle.Tournament
  alias Codebattle.User

  def get_player(%{players_table: nil} = tournament, id), do: Map.get(tournament.players, to_id(id))

  def get_player(tournament, id), do: Tournament.Players.get_player(tournament, id)

  def get_players(%{players_table: nil} = tournament), do: Map.values(tournament.players)
  def get_players(tournament), do: Tournament.Players.get_players(tournament)

  def get_players(%{players_table: nil} = tournament, ids), do: Enum.map(ids, &get_player(tournament, &1))

  def get_players(tournament, ids), do: Tournament.Players.get_players(tournament, ids)

  def get_tasks(%{tasks_table: nil} = _tournament), do: []
  def get_tasks(tournament), do: Tournament.Tasks.get_tasks(tournament)

  def players_count(%{players_table: nil} = tournament) do
    tournament |> get_players() |> Enum.count()
  end

  def players_count(tournament) do
    Tournament.Players.count(tournament)
  end

  def get_paginated_players(%{players_table: nil} = tournament, _page_num, _page_size) do
    # return all players, cause we don't want to paginate if tournament finished
    get_players(tournament)
  end

  def get_paginated_players(tournament, page_num, page_size) do
    start_index = (page_num - 1) * page_size
    end_index = start_index + page_size - 1

    tournament
    |> get_players()
    |> Enum.sort_by(& &1.place)
    |> Enum.slice(start_index..end_index)
  end

  def get_match(%{matches_table: nil} = tournament, id), do: Map.get(tournament.matches, to_id(id))

  def get_match(tournament, id), do: Tournament.Matches.get_match(tournament, id)

  def get_matches(%{matches_table: nil} = tournament), do: Map.values(tournament.matches)
  def get_matches(tournament), do: Tournament.Matches.get_matches(tournament)

  def get_matches(tournament, ids) when is_list(ids), do: Enum.map(ids, &get_match(tournament, &1))

  def get_matches(tournament, state) when is_binary(state) do
    tournament |> get_matches() |> Enum.filter(&(&1.state == state))
  end

  def get_matches(tournament, ids_or_state), do: Tournament.Matches.get_matches(tournament, ids_or_state)

  def get_matches_by_players(tournament, player_ids) do
    matches_ids =
      tournament
      |> get_players(player_ids)
      |> Enum.filter(& &1)
      |> Enum.flat_map(& &1.matches_ids)
      |> Enum.uniq()

    get_matches(tournament, matches_ids)
  end

  def get_round_matches(tournament) do
    tournament
    |> get_matches()
    |> Enum.sort_by(& &1.round_position)
    |> Enum.chunk_by(& &1.round_position)
  end

  def get_player_opponents_from_matches(tournament, matches, player_id) do
    matches
    |> Enum.flat_map(& &1.player_ids)
    |> Enum.reject(&(is_nil(&1) || &1 == player_id))
    |> Enum.uniq()
    |> then(&get_players(tournament, &1))
  end

  def get_opponents(tournament, player_ids) do
    opponent_ids =
      player_ids
      |> Enum.flat_map(fn player_id ->
        tournament
        |> get_matches_by_players([player_id])
        |> Enum.map(&get_opponent_id(&1, player_id))
      end)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    Enum.map(opponent_ids, &get_player(tournament, &1))
  end

  def matches_count(t), do: Tournament.Matches.count(t)

  def get_top_game_id(tournament) do
    tournament
    |> get_matches("playing")
    |> Enum.sort_by(& &1.id, :asc)
    |> Enum.at(0)
    |> case do
      %{game_id: game_id} when not is_nil(game_id) -> game_id
      _ -> nil
    end
  end

  def get_current_round_matches(tournament) do
    tournament
    |> get_matches()
    |> Enum.filter(&(&1.round_position == tournament.current_round_position))
  end

  def get_round_matches(tournament, round_position) do
    tournament |> get_matches() |> Enum.filter(&(&1.round_position == round_position))
  end

  def get_current_round_playing_matches(tournament) do
    tournament
    |> get_matches()
    |> Enum.filter(&(&1.round_position == tournament.current_round_position and &1.state == "playing"))
  end

  def match_player?(match, player_id), do: Enum.any?(match.player_ids, &(&1 == player_id))

  def get_player_ids(tournament), do: tournament |> get_players() |> Enum.map(& &1.id)

  def get_opponent_id(%{player_ids: [p1_id, p2_id]} = _match, p1_id), do: p2_id
  def get_opponent_id(%{player_ids: [p2_id, p1_id]} = _match, p1_id), do: p2_id
  def get_opponent_id(_match, _p_id), do: nil

  def can_be_started?(%{state: "waiting_participants"} = tournament) do
    players_count(tournament) > 0
  end

  def can_be_started?(_t), do: false

  def can_moderate?(tournament, user) do
    creator?(tournament, user) || User.admin?(user)
  end

  def can_access?(%{access_type: "token"} = tournament, user, params) do
    can_moderate?(tournament, user) ||
      player?(tournament, user.id) ||
      params["access_token"] == tournament.access_token
  end

  # default public or null for old tournaments
  def can_access?(_tournament, _user, _params), do: true

  def active?(tournament), do: tournament.state == "active"
  def waiting_participants?(tournament), do: tournament.state == "waiting_participants"
  def canceled?(tournament), do: tournament.state == "canceled"
  def finished?(tournament), do: tournament.state == "finished"
  def individual?(tournament), do: tournament.type == "individual"
  def public?(tournament), do: tournament.access_type == "public"
  def visible_by_token?(tournament), do: tournament.access_type == "token"
  def in_break?(tournament), do: tournament.break_state == "on"

  def player?(tournament, player_id) do
    tournament
    |> get_player(player_id)
    |> Kernel.!()
    |> Kernel.!()
  end

  def player?(tournament, player_id, team_id) do
    tournament
    |> get_player(player_id)
    |> case do
      %{team_id: ^team_id} -> true
      _ -> false
    end
  end

  def creator?(tournament, user) do
    tournament.creator_id == user.id
  end

  def calc_round_result(round_position) do
    round_position
    |> Enum.map(&calc_match_result/1)
    |> Enum.reduce([0, 0], fn [x1, x2], [a1, a2] -> [x1 + a1, x2 + a2] end)
  end

  def get_clans_by_ranking(%{use_clan: false}, _), do: %{}

  def get_clans_by_ranking(tournament, %{entries: ranking}) when is_list(ranking) do
    get_clans_by_ranking(tournament, ranking)
  end

  def get_clans_by_ranking(tournament, ranking) when is_map(ranking) do
    get_clans_by_ranking(tournament, Map.values(ranking))
  end

  def get_clans_by_ranking(tournament, ranking) when is_list(ranking) do
    if tournament.use_clan do
      ranking
      |> Enum.map(& &1.id)
      |> then(&Tournament.Clans.get_clans(tournament, &1))
    else
      %{}
    end
  end

  def get_clans_by_ranking(_tournament, _ranking), do: %{}

  def get_player_latest_match(tournament, player_id) do
    with player when not is_nil(player) <- get_player(tournament, player_id),
         true <- player.matches_ids != [],
         match_id when not is_nil(match_id) <- Enum.max(player.matches_ids) do
      get_match(tournament, match_id)
    else
      _ -> nil
    end
  end

  def get_active_game_id(tournament, player_id) do
    case get_player_latest_match(tournament, player_id) do
      %{state: "playing", game_id: game_id} -> game_id
      _ -> nil
    end
  end

  def get_stats(_tournament) do
    # Enum.reduce(get_matches(tournament), %{}, fn match, acc ->
    # Map.put(acc, to_id(match.id), match)
    # end)

    %{}
  end

  def get_winner_ids(%{state: "finished"}) do
    # TODO: implement tournament winner ids
    []
  end

  def get_winner_ids(_tournament), do: []

  # 1. picks human winner for game_over
  # 2. picks random human if timeout
  # 2. picks random from canceled
  # 3. picks random from timeout
  # 4. picks random
  def pick_winner_id(%{state: "game_over", winner_id: id}) when not is_nil(id) and id > 0, do: id

  def pick_winner_id(%{player_ids: ids}) do
    case Enum.sort(ids) do
      [id1, _id2] when id1 > 0 -> Enum.random(ids)
      [_id1, id2] -> id2
    end
  end

  defp calc_match_result(%{state: "game_over", player_ids: [id, _], winner_id: id}), do: [1, 0]
  defp calc_match_result(%{state: "game_over", player_ids: [_, id], winner_id: id}), do: [0, 1]
  defp calc_match_result(_), do: [0, 0]

  # defp match_is_finished?(%{state: "game_over"}), do: true
  # defp match_is_finished?(%{state: "canceled"}), do: true
  # defp match_is_finished?(%{state: "timeout"}), do: true
  # defp match_is_finished?(_match), do: false

  # defp is_winner?(%{players: players}, player) do
  #   Enum.any?(players, fn x -> x.id == player.id and x.result == "won" end)
  # end

  # defp get_average_time([]), do: 0

  # defp get_average_time(matches) do
  #   div(Enum.reduce(matches, 0, fn x, acc -> acc + x.duration end), Enum.count(matches))
  # end

  # defp get_team_by_id(teams, team_id), do: Enum.find(teams, fn x -> x.id == team_id end)

  def to_id(id) when is_integer(id), do: id |> to_string() |> to_id()
  def to_id(id) when is_binary(id), do: String.to_atom(id)
  def to_id(id) when is_atom(id), do: id

  def prepare_to_json(tournament) do
    Map.drop(tournament, [
      :__struct__,
      :__meta__,
      :clans_table,
      :creator,
      :matches,
      :players,
      :event,
      :matches_table,
      :played_pair_ids,
      :players_table,
      :ranking_table,
      :waiting_room_state,
      :tasks_table
    ])
  end

  def tournament_info(tournament) do
    Map.take(tournament, [
      :id,
      :clans_table,
      :type,
      :ranking_type,
      :matches_table,
      :players_table,
      :ranking_table,
      :tasks_table
    ])
  end

  def get_players_total_games_count(%{task_provider: "task_pack", task_strategy: "sequential"} = t, _player) do
    t |> Tournament.Tasks.get_task_ids() |> Enum.count()
  end

  def get_players_total_games_count(_tournament, nil), do: 0
  def get_players_total_games_count(_tournament, player), do: Enum.count(player.matches_ids)

  def get_player_ranking_stats(tournament) do
    players = get_players(tournament)

    total_ranking =
      tournament
      |> Tournament.TournamentResult.get_user_ranking()
      |> Map.values()
      |> Enum.sort_by(& &1.place)

    top_8_ids = total_ranking |> Enum.take(8) |> Enum.map(& &1.id)
    user_history = Tournament.TournamentResult.get_users_history(tournament, top_8_ids)

    %{
      "tournament_id" => tournament.id,
      "current_round" => tournament.current_round_position + 1,
      "players" =>
        players
        |> Enum.map(fn player ->
          %{
            "id" => to_string(player.id),
            "name" => player.name,
            "clan_id" => player.clan_id && to_string(player.clan_id),
            "total_score" => player.score,
            "total_tasks" => Enum.count(player.matches_ids),
            "won_tasks" => player.wins_count,
            "rank" => player.rank,
            # TODO: do win_prob based on the top 8 people
            "win_prob" => "42",
            "active" => if(player.in_main_draw, do: 1, else: 0),
            "history" => user_history[player.id] || []
          }
        end)
        |> Enum.sort_by(& &1["rank"])
    }
  end
end
