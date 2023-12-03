defmodule Codebattle.Tournament.Helpers do
  alias Codebattle.User
  alias Codebattle.Tournament

  def get_player(tournament = %{players_table: nil}, id),
    do: Map.get(tournament.players, id)

  def get_player(tournament, id), do: Tournament.Players.get_player(tournament, id)

  def get_players(tournament = %{players_table: nil}), do: tournament.players |> Map.values()
  def get_players(tournament), do: Tournament.Players.get_players(tournament)

  def get_players(tournament = %{players_table: nil}, ids),
    do: Enum.map(ids, &get_player(tournament, &1))

  def get_players(tournament, ids), do: Tournament.Players.get_players(tournament, ids)

  def players_count(tournament = %{players_table: nil}) do
    tournament |> get_players() |> Enum.count()
  end

  def players_count(tournament) do
    Tournament.Players.count(tournament)
  end

  def get_paginated_players(tournament = %{players_table: nil}, _page_num, _page_size) do
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

  def get_top_players(tournament = %{players_table: nil}, _page_num, _page_size) do
    # return all players, cause we don't want to paginate if tournament finished
    get_players(tournament)
  end

  # only for waiting_participants, cause all players have score = 0
  # we don't care about ordering
  def get_top_players(tournament = %{type: type, top_player_ids: []})
      when type in ["swiss", "ladder", "stairway"] do
    tournament |> get_players() |> Enum.take(30)
  end

  # we don't want to cut plaeyrs for team/individual tournaments for players
  def get_top_players(tournament = %{top_player_ids: []}) do
    get_players(tournament)
  end

  def get_top_players(tournament = %{top_player_ids: ids}) do
    get_players(tournament, ids)
  end

  def players_count(tournament, team_id) do
    tournament |> get_team_players(team_id) |> Enum.count()
  end

  def get_match(tournament = %{matches_table: nil}, id),
    do: Map.get(tournament.matches, id)

  def get_match(tournament, id), do: Tournament.Matches.get_match(tournament, id)

  def get_matches(tournament = %{matches_table: nil}), do: tournament.matches |> Map.values()
  def get_matches(tournament), do: Tournament.Matches.get_matches(tournament)

  def get_matches(tournament = %{matches_table: nil}, ids) when is_list(ids),
    do: Enum.map(ids, &get_match(tournament, &1))

  def get_matches(tournament = %{matches_table: nil}, state) when is_binary(state) do
    tournament |> get_matches() |> Enum.filter(&(&1.state == state))
  end

  def get_matches(tournament, ids_or_state),
    do: Tournament.Matches.get_matches(tournament, ids_or_state)

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
    |> Enum.sort_by(& &1.round)
    |> Enum.chunk_by(& &1.round)
  end

  def matches_count(t), do: Tournament.Matches.count(t)

  def get_current_round_matches(tournament) do
    tournament
    |> get_matches()
    |> Enum.filter(&(&1.round == tournament.current_round))
  end

  def get_round_matches(tournament, round) do
    tournament |> get_matches |> Enum.filter(&(&1.round == round))
  end

  def get_current_round_playing_matches(tournament) do
    tournament
    |> get_matches()
    |> Enum.filter(&(&1.round == tournament.current_round and &1.state == "playing"))
  end

  def is_match_player?(match, player_id), do: Enum.any?(match.player_ids, &(&1 == player_id))

  def get_player_ids(tournament), do: tournament |> get_players |> Enum.map(& &1.id)

  def can_be_started?(tournament = %{state: "waiting_participants"}) do
    players_count(tournament) > 0
  end

  def can_be_started?(_t), do: false

  def can_moderate?(tournament, user) do
    is_creator?(tournament, user) || User.admin?(user)
  end

  def can_access?(tournament = %{access_type: "token"}, user, params) do
    can_moderate?(tournament, user) ||
      is_player?(tournament, user.id) ||
      params["access_token"] == tournament.access_token
  end

  # default public or null for old tournaments
  def can_access?(_tournament, _user, _params), do: true

  def is_active?(tournament), do: tournament.state == "active"
  def is_waiting_participants?(tournament), do: tournament.state == "waiting_participants"
  def is_canceled?(tournament), do: tournament.state == "canceled"
  def is_finished?(tournament), do: tournament.state == "finished"
  def is_individual?(tournament), do: tournament.type == "individual"
  def is_stairway?(tournament), do: tournament.type == "stairway"
  def is_team?(tournament), do: tournament.type == "team"
  def is_public?(tournament), do: tournament.access_type == "public"
  def is_visible_by_token?(tournament), do: tournament.access_type == "token"
  def in_break?(tournament), do: tournament.break_state == "on"

  def is_player?(tournament, player_id) do
    tournament
    |> get_player(player_id)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_player?(tournament, player_id, team_id) do
    tournament
    |> get_player(player_id)
    |> case do
      %{team_id: ^team_id} -> true
      _ -> false
    end
  end

  def is_creator?(tournament, user) do
    tournament.creator_id == user.id
  end

  def calc_round_result(round) do
    round
    |> Enum.map(&calc_match_result/1)
    |> Enum.reduce([0, 0], fn [x1, x2], [a1, a2] -> [x1 + a1, x2 + a2] end)
  end

  def get_teams(%{meta: %{teams: teams}}), do: Map.values(teams)
  def get_teams(_), do: []

  def get_team_players(tournament = %{type: "team"}, team_id) do
    tournament |> get_players |> Enum.filter(&(&1.team_id == team_id))
  end

  # def get_players_statistics(tournament = %{type: "team"}) do
  #   all_win_matches =
  #     tournament
  #     |> get_matches()
  #     |> Enum.filter(fn match ->
  #       match_is_finished?(match) and !is_anyone_gave_up?(match)
  #     end)

  #   unless Enum.empty?(all_win_matches) do
  #     tournament
  #     |> get_players()
  #     |> Enum.map(fn player ->
  #       team = tournament |> get_teams() |> get_team_by_id(player.team_id)
  #       win_matches = Enum.filter(all_win_matches, &is_winner?(&1, player))

  #       params = %{
  #         team: team.title,
  #         score: Enum.count(win_matches),
  #         average_time: get_average_time(win_matches)
  #       }

  #       player
  #       |> Map.from_struct()
  #       |> Map.merge(params)
  #     end)
  #     |> Enum.sort_by(&{-&1.score, &1.average_time})
  #   end
  # end

  # TODO: optimize search active_game algo
  def get_active_game_id(tournament, player_id) do
    tournament
    |> get_matches()
    |> Enum.find(fn match ->
      match_is_active?(match) && Enum.any?(match.player_ids, fn id -> id == player_id end)
    end)
    |> case do
      nil -> nil
      match -> match.game_id
    end
  end

  # TODO: optimize search active_match algo
  def get_active_match(tournament, player) do
    match =
      tournament
      |> get_matches()
      |> Enum.find(fn match ->
        match_is_active?(match) && Enum.any?(match.player_ids, fn id -> id == player.id end)
      end)

    case match do
      nil -> tournament |> get_matches |> Enum.find(&match_is_active?/1)
      match -> match
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

  defp match_is_active?(%{state: "active"}), do: true
  defp match_is_active?(%{state: "playing"}), do: true
  defp match_is_active?(_match), do: false
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
end
