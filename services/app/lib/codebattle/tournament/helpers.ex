defmodule Codebattle.Tournament.Helpers do
  alias Codebattle.Tournament
  alias Codebattle.Repo

  def is_participant?(tournament, player_id) do
    tournament.data.players
    |> Enum.find_value(fn player -> player.id == player_id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_creator?(tournament, player_id) do
    tournament.creator_id == player_id
  end

  def add_participant(tournament, user) do
    new_players =
      tournament.data.players
      |> Enum.concat([user])
      |> Enum.uniq_by(fn x -> x.id end)

    tournament
    |> Tournament.changeset(%{
      data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
    })
    |> Repo.update!()
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

  def cancel!(tournament, user) do
    if is_creator?(tournament, user.id) do
      tournament
      |> Tournament.changeset(%{state: "canceled"})
      |> Repo.update!()
    else
      tournament
    end
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
    |> Tournament.changeset(Map.merge(params, %{"starts_at" => starts_at}))
    |> Repo.insert()
  end


  def start!(tournament, user) do
    if is_creator?(tournament, user.id) do
      tournament
      |> Tournament.changeset(%{state: "canceled"})
      |> Repo.update!()
    else
      tournament
    end
  end
end
