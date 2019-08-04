defmodule Codebattle.Tournament.Helpers do
  alias Codebattle.Tournament
  alias Codebattle.Repo

  def get_players(tournament), do: tournament.data.players
  def get_matches(tournament), do: tournament.data.matches

  def players_count(tournament) do
    tournament |> get_players |> Enum.count()
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

  def is_creator?(tournament, player_id) do
    tournament.creator_id == player_id
  end

  def join(tournament, user) do
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

    %Tournament{}
    |> Tournament.changeset(Map.merge(params, %{"starts_at" => starts_at, "step" => 0}))
    |> Repo.insert()
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
      |> build_matches(tournament.step)
      |> Tournament.changeset(%{state: "active"})
      |> Repo.update!()
    else
      tournament
    end
  end

  defp complete_players(tournament) do
    if tournament.players_count == players_count(tournament) do
      tournament
    else
      bot = Codebattle.Bot.Builder.build()

      new_players =
        tournament
        |> get_players
        |> Enum.concat([bot])
        |> Enum.uniq_by(fn x -> x.id end)

      # TODO: optimize DB inserts
      tournament
      |> Tournament.changeset(%{
        data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
      })
      |> Repo.update!()
      |> complete_players()
    end
  end

  defp build_matches(tournament, 0) do
    players = tournament |> get_players |> Enum.shuffle()

    matches =
      Enum.reduce(players, [%{}], fn player, acc ->
        case List.first(acc) do
          map when map == %{} ->
            [_h | t] = acc
            [%{state: "waiting", players: [player]} | t]

          match ->
            case(Enum.count(match.players)) do
              1 ->
                [_h | t] = acc
                [DeepMerge.deep_merge(match, %{players: [player | match.players]}) | t]

              _ ->
                [%{state: "waiting", players: [player]} | acc]
            end
        end
      end)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: matches})
    })
    |> Repo.update!()
  end
end
