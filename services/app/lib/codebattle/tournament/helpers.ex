defmodule Codebattle.Tournament.Helpers do
  alias Codebattle.Repo
  alias Codebattle.User

  import Ecto.Query

  def get_players(tournament), do: tournament.data.players
  def get_matches(tournament), do: tournament.data.matches
  def get_intended_player_ids(tournament), do: Map.get(tournament.data, :intended_player_ids, [])
  def get_player_ids(tournament), do: tournament.data.players |> Enum.map(& &1.id)

  def get_intended_players(tournament) do
    Repo.all(
      from(u in User,
        where: u.id in ^get_intended_player_ids(tournament),
        order_by: {:desc, :rating}
      )
    )
  end

  def players_count(tournament) do
    tournament |> get_players |> Enum.count()
  end

  def players_count(tournament, team_id) do
    tournament |> get_team_players(team_id) |> Enum.count()
  end

  def can_be_started?(%{state: "upcoming"} = tournament) do
    get_intended_player_ids(tournament) != []
  end

  def can_be_started?(%{state: "waiting_participants"} = tournament) do
    players_count(tournament) > 0
  end

  def can_be_started?(_t), do: false

  def can_moderate?(tournament, user) do
    is_creator?(tournament, user) || User.is_admin?(user)
  end

  def can_access?(%{access_type: "token"} = tournament, user, params) do
    can_moderate?(tournament, user) ||
      is_intended_player?(tournament, user) ||
      is_player?(tournament, user.id) ||
      params["access_token"] == tournament.access_token
  end

  # default public or null for old tournaments
  def can_access?(_tournament, _user, _params), do: true

  def is_active?(tournament), do: tournament.state == "active"
  def is_waiting_participants?(tournament), do: tournament.state == "waiting_participants"
  def is_upcoming?(tournament), do: tournament.state == "upcoming"
  def is_canceled?(tournament), do: tournament.state == "canceled"
  def is_finished?(tournament), do: tournament.state == "finished"
  def is_individual?(tournament), do: tournament.type == "individual"
  def is_stairway?(tournament), do: tournament.type == "stairway"
  def is_team?(tournament), do: tournament.type == "team"
  def is_public?(tournament), do: tournament.access_type == "public"
  def is_visible_by_token?(tournament), do: tournament.access_type == "token"

  def is_intended_player?(tournament, player) do
    tournament
    |> get_intended_player_ids()
    |> Enum.any?(fn id -> id == player.id end)
  end

  def is_player?(tournament, player_id) do
    tournament
    |> get_players()
    |> Enum.find_value(fn player -> player.id == player_id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_player?(tournament, player_id, team_id) do
    tournament.data.players
    |> Enum.find_value(fn p -> p.id == player_id and p.team_id == team_id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_creator?(tournament, user) do
    tournament.creator_id == user.id
  end

  def calc_round_result(round) do
    round
    |> Enum.map(&calc_match_result/1)
    |> Enum.reduce(fn {x1, x2}, {a1, a2} -> {x1 + a1, x2 + a2} end)
  end

  def get_round_id([%{round_id: round_id} | _]), do: round_id

  def get_rounds(tournament) do
    tournament
    |> get_matches()
    |> Enum.chunk_by(& &1.round_id)
    |> Enum.sort_by(&get_round_id/1)
  end

  def get_teams(%{meta: %{teams: teams}}),
    do: Enum.map(teams, fn x -> %{id: x.id, title: x.title} end)

  def get_teams(%{meta: %{"teams" => teams}}),
    do: Enum.map(teams, fn x -> %{id: x["id"], title: x["title"]} end)

  def get_teams(_), do: []

  def get_team_players(%{type: "team"} = tournament, team_id) do
    tournament |> get_players |> Enum.filter(&(&1.team_id == team_id))
  end

  def get_players_statistics(%{type: "team"} = tournament) do
    all_win_matches =
      tournament
      |> get_matches()
      |> Enum.filter(fn match ->
        match_is_finished?(match) and !is_anyone_gave_up?(match)
      end)

    unless Enum.empty?(all_win_matches) do
      tournament
      |> get_players()
      |> Enum.map(fn player ->
        team = tournament |> get_teams() |> get_team_by_id(player.team_id)
        win_matches = Enum.filter(all_win_matches, &is_winner?(&1, player))

        params = %{
          team: team.title,
          score: Enum.count(win_matches),
          average_time: get_average_time(win_matches)
        }

        player
        |> Map.from_struct()
        |> Map.merge(params)
      end)
      |> Enum.sort_by(&{-&1.score, &1.average_time})
    end
  end

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

  def get_tournament_statistics(%{type: "team"} = tournament) do
    all_win_matches =
      tournament
      |> get_matches()
      |> Enum.filter(fn match ->
        match_is_finished?(match) and !is_anyone_gave_up?(match)
      end)

    best_lang =
      all_win_matches
      |> Enum.map(fn match ->
        pick_winner(match).lang
      end)
      |> Enum.chunk_by(fn x -> x end)
      |> Enum.max_by(fn x -> Enum.count(x) end, fn -> [] end)
      |> Enum.at(0, "None")

    best_time =
      all_win_matches
      |> Enum.map(fn match -> match.duration end)
      |> Enum.min(fn -> [] end)

    %{
      best_lang: best_lang,
      best_time: best_time
    }
  end

  def get_tournament_statistics(_), do: %{}

  # 1. picks human winner
  # 2. picks human loser instead of bot
  # 3. picks human winner if gave_up
  # 4. picks random bot
  def pick_winner(%{players: [%{result: "won", is_bot: false} = winner, _]}), do: winner
  def pick_winner(%{players: [_, %{result: "won", is_bot: false} = winner]}), do: winner
  def pick_winner(%{players: [winner, %{result: "gave_up"}]}), do: winner
  def pick_winner(%{players: [%{result: "gave_up"}, winner]}), do: winner
  def pick_winner(match), do: Enum.random(match.players)

  def filter_statistics(statistics, "show"), do: statistics
  def filter_statistics(statistics, "hide"), do: [List.first(statistics)]

  def calc_team_score(tournament) do
    tournament
    |> get_rounds()
    |> Enum.filter(fn round ->
      Enum.all?(round, &(&1.state in ["canceled", "game_over", "timeout"]))
    end)
    |> Enum.map(&calc_round_result/1)
    |> Enum.reduce({0, 0}, fn {x1, x2}, {a1, a2} ->
      cond do
        x1 > x2 -> {a1 + 1, a2}
        x1 < x2 -> {a1, a2 + 1}
        true -> {a1 + 0.5, a2 + 0.5}
      end
    end)
  end

  defp calc_match_result(%{players: [%{result: "won"}, _]}), do: {1, 0}
  defp calc_match_result(%{players: [_, %{result: "won"}]}), do: {0, 1}
  defp calc_match_result(%{players: [_, %{result: "gave_up"}]}), do: {1, 0}
  defp calc_match_result(%{players: [%{result: "gave_up"}, _]}), do: {0, 1}
  defp calc_match_result(_), do: {0, 0}

  defp match_is_active?(%{state: "active"}), do: true
  defp match_is_active?(_match), do: false
  defp match_is_finished?(%{state: "game_over"}), do: true
  defp match_is_finished?(%{state: "canceled"}), do: true
  defp match_is_finished?(%{state: "timeout"}), do: true
  defp match_is_finished?(_match), do: false

  defp is_anyone_gave_up?(%{players: [%{result: "gave_up"}, _]}), do: true
  defp is_anyone_gave_up?(%{players: [_, %{result: "gave_up"}]}), do: true
  defp is_anyone_gave_up?(_), do: false

  defp is_winner?(%{players: players}, player) do
    Enum.any?(players, fn x -> x.id == player.id and x.result == "won" end)
  end

  defp get_average_time([]), do: 0

  defp get_average_time(matches) do
    div(Enum.reduce(matches, 0, fn x, acc -> acc + x.duration end), Enum.count(matches))
  end

  defp get_team_by_id(teams, team_id), do: Enum.find(teams, fn x -> x.id == team_id end)

  def get_current_task(tournament), do: tournament.meta["current_task"]
end
