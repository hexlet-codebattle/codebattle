defmodule Codebattle.Tournament.Helpers do
  alias Codebattle.User
  alias Codebattle.Tournament

  def get_players(tournament), do: tournament.players |> Map.values()
  def get_players(tournament, ids), do: Enum.map(ids, &get_player(tournament, &1))
  def get_matches(tournament), do: tournament.matches |> Map.values()
  def get_matches(tournament, range), do: Enum.map(range, &get_match(tournament, &1))

  def get_round_matches(tournament) do
    tournament
    |> get_matches()
    |> Enum.sort_by(& &1.round)
    |> Enum.chunk_by(& &1.round)
  end

  def get_round_matches(tournament, round) do
    tournament |> get_matches |> Enum.filter(&(&1.round == round))
  end

  def get_current_round_playing_matches(tournament) do
    tournament
    |> get_matches
    |> Enum.filter(&(&1.round == tournament.current_round and &1.state == "playing"))
  end

  def get_player(tournament, id), do: Map.get(tournament.players, to_id(id))
  def get_match(tournament, id), do: Map.get(tournament.matches, to_id(id))

  def get_first_match(tournament),
    do: tournament.matches |> Map.get(to_id(0))

  def is_match_player?(match, player_id), do: Enum.any?(match.player_ids, &(&1 == player_id))

  def get_player_ids(tournament), do: tournament |> get_players |> Enum.map(& &1.id)

  def get_match_players(_tournament, nil), do: []

  def get_match_players(tournament, match) do
    match.player_ids
    |> Enum.map(&Map.get(tournament.players, to_id(&1)))
    |> Enum.map(&Tournament.Player.new!(&1))
  end

  def players_count(tournament) do
    tournament |> get_players() |> Enum.count()
  end

  def players_count(tournament, team_id) do
    tournament |> get_team_players(team_id) |> Enum.count()
  end

  def matches_count(tournament) do
    tournament |> get_matches() |> Enum.count()
  end

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

  def is_player?(tournament, player_id) do
    tournament.players
    |> Map.get(to_id(player_id))
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_player?(tournament, player_id, team_id) do
    tournament.players
    |> Map.get(to_id(player_id))
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

  def get_active_match(tournament, current_user) do
    match =
      tournament
      |> get_matches
      |> Enum.find(fn match ->
        match_is_active?(match) && Enum.any?(match.players, fn p -> p.id == current_user.id end)
      end)

    case match do
      nil -> tournament |> get_matches |> Enum.find(&match_is_active?/1)
      match -> match
    end
  end

  def get_stats(tournament) do
    Enum.reduce(tournament.matches, %{}, fn match, acc ->
      Map.put(acc, to_id(match.id), match)
    end)

    %{}
  end

  def get_winner_ids(tournament = %{state: "finished"}) do
    tournament
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
  defp match_is_finished?(%{state: "game_over"}), do: true
  defp match_is_finished?(%{state: "canceled"}), do: true
  defp match_is_finished?(%{state: "timeout"}), do: true
  defp match_is_finished?(_match), do: false

  defp is_winner?(%{players: players}, player) do
    Enum.any?(players, fn x -> x.id == player.id and x.result == "won" end)
  end

  defp get_average_time([]), do: 0

  defp get_average_time(matches) do
    div(Enum.reduce(matches, 0, fn x, acc -> acc + x.duration end), Enum.count(matches))
  end

  defp get_team_by_id(teams, team_id), do: Enum.find(teams, fn x -> x.id == team_id end)

  def get_current_round_task(tournament) do
    Map.get(tournament.round_tasks, to_id(tournament.current_round))
  end

  def get_round_task(tournament, round) do
    Map.get(tournament.round_tasks, to_id(round))
  end

  def to_id(id) when is_integer(id), do: id |> to_string() |> to_id()
  def to_id(id) when is_binary(id), do: String.to_atom(id)
  def to_id(id) when is_atom(id), do: id
end
