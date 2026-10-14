defmodule CodebattleWeb.Frontend.Present do
  @moduledoc """
  Lean JSON for the new frontend's list/detail pages. The schemas' own
  encoders include everything (a task carries all its asserts), which is far
  too heavy for a list.
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User

  @task_fields [
    :id,
    :name,
    :level,
    :time_to_solve_sec,
    :base_score,
    :tags,
    :origin,
    :state,
    :visibility,
    :creator_id,
    :inserted_at,
    :updated_at
  ]

  @task_pack_fields [:id, :name, :state, :visibility, :task_ids, :creator_id, :inserted_at, :updated_at]

  @doc "Tasks with their creator's name (one users query for the whole list)."
  def tasks(tasks), do: with_creators(tasks, @task_fields)

  def task_packs(task_packs), do: with_creators(task_packs, @task_pack_fields)

  def task_pack(task_pack), do: task_pack |> List.wrap() |> task_packs() |> hd()

  defp with_creators(records, fields) do
    names = creator_names(Enum.map(records, & &1.creator_id))

    Enum.map(records, fn record ->
      record
      |> Map.take(fields)
      |> Map.put(:creator, creator_ref(record.creator_id, names))
    end)
  end

  defp creator_names(ids) do
    case ids |> Enum.reject(&is_nil/1) |> Enum.uniq() do
      [] -> %{}
      ids -> Map.new(Repo.all(from(u in User, where: u.id in ^ids, select: {u.id, u.name})))
    end
  end

  defp creator_ref(nil, _names), do: nil
  defp creator_ref(id, names), do: if(name = names[id], do: %{id: id, name: name})

  def clan(clan) do
    %{
      id: clan.id,
      name: clan.name,
      long_name: clan.long_name,
      users_count: Map.get(clan, :users_count),
      inserted_at: clan.inserted_at,
      creator: user_ref(clan.creator)
    }
  end

  def clan_member(user) do
    %{
      id: user.id,
      name: user.name,
      avatar_url: user.avatar_url,
      lang: user.lang,
      rating: user.rating,
      rank: user.rank,
      points: user.points,
      inserted_at: user.inserted_at
    }
  end

  defp user_ref(%{id: id, name: name}), do: %{id: id, name: name}
  defp user_ref(_), do: nil
end
