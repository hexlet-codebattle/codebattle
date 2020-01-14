defmodule Codebattle.Tournament.Helpers do
  alias Codebattle.Repo
  alias Codebattle.Tournament

  @match_timeout Application.fetch_env!(:codebattle, :tournament_match_timeout)

  def get_players(tournament), do: tournament.data.players
  def get_matches(tournament), do: tournament.data.matches
  def get_teams(%{type: "team", meta: meta}), do: meta["teams"]

  def get_rounds(%{type: "team"} = tournament) do
    tournament
    |> get_matches()
    |> Enum.chunk_by(& &1.round_id)
    |> Enum.sort_by(&get_round_id/1)
  end

  def get_round_id([%{round_id: round_id} | _]), do: round_id

  def get_team_players(%{type: "team"} = tournament, team_id) do
    tournament |> get_players |> Enum.filter(&(&1.team_id == team_id))
  end

  def players_count(tournament) do
    tournament |> get_players |> Enum.count()
  end

  def players_count(tournament, team_id) do
    tournament |> get_team_players(team_id) |> Enum.count()
  end

  def is_active?(tournament) do
    tournament.state == "active"
  end

  def is_waiting_partisipants?(tournament) do
    tournament.state == "waiting_participants"
  end

  def is_participant?(tournament, player_id) do
    tournament.data.players
    |> Enum.find_value(fn player -> player.id == player_id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_participant?(%{type: "team"} = tournament, player_id, team_id) do
    tournament.data.players
    |> Enum.find_value(fn p -> p.id == player_id and p.team_id == team_id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_creator?(tournament, player_id) do
    tournament.creator_id == player_id
  end

  def join(%{type: "individual"} = tournament, user) do
    if is_waiting_partisipants?(tournament) do
      new_players =
        tournament.data.players
        |> Enum.concat([user])
        |> Enum.uniq_by(fn x -> x.id end)

      tournament
      |> Tournament.changeset(%{
        data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
      })
      |> Repo.update!()
    else
      tournament
    end
  end

  def join(%{type: "team"} = tournament, user, team_id) do
    if is_waiting_partisipants?(tournament) do
      new_players =
        tournament.data.players
        |> Enum.filter(fn x -> x.id != user.id end)
        |> Enum.concat([Map.put(user, :team_id, team_id)])

      tournament
      |> Tournament.changeset(%{
        data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
      })
      |> Repo.update!()
    else
      tournament
    end
  end

  def leave(tournament, user) do
    new_players =
      tournament.data.players
      |> Enum.filter(fn x -> x.id != user.id end)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
    })
    |> Repo.update!()
  end

  def create(params) do
    now = NaiveDateTime.utc_now()

    starts_at =
      case params["starts_at_type"] do
        "1_min" -> NaiveDateTime.add(now, 1 * 60)
        "5_min" -> NaiveDateTime.add(now, 5 * 60)
        "10_min" -> NaiveDateTime.add(now, 10 * 60)
        "30_min" -> NaiveDateTime.add(now, 30 * 60)
        _ -> NaiveDateTime.add(now, 60 * 60)
      end

    meta =
      case params["type"] do
        "team" ->
          %{
            teams: [
              %{id: 0, title: "frontend"},
              %{id: 1, title: "backend"}
            ]
          }

        _ ->
          %{}
      end

    result =
      %Tournament{}
      |> Tournament.changeset(
        Map.merge(params, %{"starts_at" => starts_at, "step" => 0, "meta" => meta})
      )
      |> Repo.insert()

    case result do
      {:ok, tournament} ->
        {:ok, _pid} = Codebattle.Tournament.Server.start(tournament)
        {:ok, tournament}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def cancel!(tournament, user) do
    if is_creator?(tournament, user.id) do
      tournament
      |> Tournament.changeset(%{state: "canceled"})
      |> Repo.update!()
    else
      tournament
    end
  end

  def start!(tournament, user) do
    if is_creator?(tournament, user.id) do
      tournament
      |> complete_players
      |> start_step!
      |> Tournament.changeset(%{state: "active"})
      |> Repo.update!()
    else
      tournament
    end
  end

  def maybe_start_new_step(%{type: "individual"} = tournament) do
    matches = tournament |> get_matches

    if Enum.any?(matches, fn match -> match.state == "active" end) do
      tournament
    else
      tournament
      |> Tournament.changeset(%{step: tournament.step + 1})
      |> Repo.update!()
      |> maybe_finish
      |> start_step!
    end
  end

  def maybe_start_new_step(%{type: "team"} = tournament) do
    matches = tournament |> get_matches

    if Enum.any?(matches, fn match -> match.state == "active" end) do
      tournament
    else
      tournament
      |> Tournament.changeset(%{step: tournament.step + 1})
      |> Repo.update!()
      |> maybe_finish
      |> start_step!
    end
  end

  def update_match(tournament, game_id, params) when is_bitstring(game_id) do
    {game_id_int, _} = Integer.parse(game_id)
    update_match(tournament, game_id_int, params)
  end

  def update_match(tournament, game_id, params) do
    new_matches =
      tournament
      |> get_matches
      |> Enum.map(fn match ->
        case match.game_id do
          ^game_id ->
            update_match_params(match, params)

          _ ->
            match
        end
        |> Map.from_struct()
      end)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
    })
    |> Repo.update!()
  end

  defp start_step!(tournament) do
    tournament
    |> build_matches
    |> start_games()
  end

  defp complete_players(%{type: "individual"} = tournament) do
    bots_count = tournament.players_count - players_count(tournament)

    new_players =
      tournament
      |> get_players
      |> Enum.concat(Codebattle.Bot.Builder.build_list(bots_count))

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
    })
    |> Repo.update!()
  end

  defp complete_players(%{type: "team", meta: meta} = tournament) do
    team_players_count =
      meta
      |> Map.get("teams")
      |> Enum.map(fn t -> {t["id"], players_count(tournament, t["id"])} end)

    {_, max_players_count} = team_players_count |> Enum.max_by(&elem(&1, 1))

    bots =
      team_players_count
      |> Enum.filter(fn {_, count} -> count < max_players_count end)
      |> Enum.reduce([], fn {team_id, count}, acc ->
        (max_players_count - count)
        |> Codebattle.Bot.Builder.build_list(%{team_id: team_id})
        |> Enum.concat(acc)
      end)

    new_players =
      tournament
      |> get_players
      |> Enum.concat(bots)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
    })
    |> Repo.update!()
  end

  defp build_matches(%{type: "team"} = tournament) do
    matches_for_round =
      tournament
      |> get_players()
      |> Enum.chunk_by(&Map.get(&1, :team_id))
      |> Enum.map(&Enum.shuffle/1)
      |> Enum.zip()
      |> Enum.map(fn {p1, p2} ->
        %{state: "waiting", players: [p1, p2], round_id: tournament.step}
      end)

    prev_matches =
      tournament
      |> get_matches()
      |> Enum.map(&Map.from_struct/1)

    new_matches = prev_matches ++ matches_for_round

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
    })
    |> Repo.update!()
  end

  defp build_matches(%Tournament{step: 4} = tournament), do: tournament

  defp build_matches(%Tournament{step: 0} = tournament) do
    players = tournament |> get_players |> Enum.shuffle()

    matches = pair_players_to_matches(players)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: matches})
    })
    |> Repo.update!()
  end

  defp build_matches(tournament) do
    matches_range =
      case(tournament.step) do
        1 -> 0..7
        2 -> 8..11
        3 -> 12..13
      end

    matches = tournament |> get_matches |> Enum.map(&Map.from_struct/1)

    players = Enum.map(matches_range, fn index -> pick_winner(Enum.at(matches, index)) end)
    new_matches = matches ++ pair_players_to_matches(players)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
    })
    |> Repo.update!()
  end

  defp pick_winner(%{players: [%{game_result: "won"} = winner, _]}), do: winner
  defp pick_winner(%{players: [_, %{game_result: "won"} = winner]}), do: winner
  defp pick_winner(%{players: [winner, %{game_result: "gave_up"}]}), do: winner
  defp pick_winner(%{players: [%{game_result: "gave_up"}, winner]}), do: winner
  defp pick_winner(match), do: Enum.random(match.players)

  defp pair_players_to_matches(players) do
    Enum.reduce(players, [%{}], fn player, acc ->
      player = Map.merge(player, %{game_result: "waiting"})

      case List.first(acc) do
        map when map == %{} ->
          [_h | t] = acc
          [%{state: "waiting", players: [player]} | t]

        match ->
          case(Enum.count(match.players)) do
            1 ->
              [_h | t] = acc
              [DeepMerge.deep_merge(match, %{players: match.players ++ [player]}) | t]

            _ ->
              [%{state: "waiting", players: [player]} | acc]
          end
      end
    end)
    |> Enum.reverse()
  end

  defp start_games(%Tournament{step: 4} = tournament), do: tournament

  defp start_games(tournament) do
    new_matches =
      tournament
      |> get_matches
      |> Enum.map(fn match ->
        case match.state do
          "waiting" ->
            {:ok, game_id} =
              Codebattle.GameProcess.Play.create_tournament_game(
                tournament,
                match.players,
                @match_timeout
              )

            %{match | game_id: game_id, state: "active"}

          _ ->
            match
        end
        |> Map.from_struct()
      end)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
    })
    |> Repo.update!()
  end

  defp update_match_params(match, %{state: "canceled"} = params), do: Map.merge(match, params)

  defp update_match_params(match, %{state: "finished"} = params) do
    %{winner: {winner_id, winner_result}, loser: {loser_id, loser_result}} = params

    new_players =
      Enum.map(match.players, fn player ->
        case player.id do
          ^winner_id -> Map.merge(player, %{game_result: winner_result})
          ^loser_id -> Map.merge(player, %{game_result: loser_result})
          _ -> player
        end
      end)

    Map.merge(match, %{players: new_players, state: "finished"})
  end

  defp maybe_finish(%Tournament{step: 4} = tournament) do
    tournament
    |> Tournament.changeset(%{state: "finished"})
    |> Repo.update!()
  end

  defp maybe_finish(tournament), do: tournament
end
