defmodule Codebattle.Tournament.UserParams do
  @moduledoc """
  Filters tournament params that come from users before they reach `Tournament.changeset/2`.

  The changeset casts nearly every field, including runtime state (`state`, `players`,
  `matches`) and fields that feed seasons and events (`grade`, `event_id`). Admins keep full
  control; everyone else may only set the fields the tournament form offers, and only task
  packs they can see.
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.TaskPack
  alias Codebattle.Tournament
  alias Codebattle.User

  @user_fields ~w(
    access_type
    break_duration_seconds
    description
    level
    match_timeout_seconds
    moderator_ids
    name
    players_limit
    ranking_type
    round_timeout_seconds
    rounds_limit
    score_strategy
    starts_at
    task_pack_name
    task_provider
    task_strategy
    timeout_mode
    tournament_timeout_seconds
    type
    use_chat
    user_timezone
  )

  @spec permit(map(), User.t(), Tournament.t() | nil) :: {:ok, map()} | {:error, map()}
  def permit(params, user, tournament \\ nil)

  def permit(params, %User{} = user, tournament) do
    if User.admin?(user) do
      {:ok, params}
    else
      params
      |> Map.take(@user_fields)
      |> keep_meta(tournament)
      |> validate_task_pack(user, tournament)
    end
  end

  # `Tournament.Context.update/2` rebuilds meta from the params on every call, so a
  # non-admin edit must carry the current meta over instead of wiping it.
  defp keep_meta(params, %Tournament{meta: meta}) when is_map(meta), do: Map.put(params, "meta", meta)
  defp keep_meta(params, _tournament), do: params

  defp validate_task_pack(%{"task_pack_name" => name} = params, user, tournament) when is_binary(name) and name != "" do
    if unchanged_task_pack?(tournament, name) || visible_task_pack?(user, name) do
      {:ok, params}
    else
      {:error, %{task_pack_name: ["is not available"]}}
    end
  end

  defp validate_task_pack(params, _user, _tournament), do: {:ok, params}

  defp unchanged_task_pack?(%Tournament{task_pack_name: name}, name), do: true
  defp unchanged_task_pack?(_tournament, _name), do: false

  defp visible_task_pack?(user, name) do
    TaskPack
    |> TaskPack.filter_visibility(user)
    |> where([tp], tp.name == ^name)
    |> Repo.exists?()
  end
end
