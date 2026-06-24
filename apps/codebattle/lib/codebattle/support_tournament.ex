defmodule Codebattle.SupportTournament do
  @moduledoc false

  import Ecto.Query

  alias Codebattle.Customization
  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserGroupTournament

  @config_key "support_tournament"
  @empty_config %{tournament_ids: [], group_tournament_ids: [], text: ""}

  def config_key, do: @config_key

  def get_config do
    case Customization.get(@config_key) do
      nil ->
        @empty_config

      value ->
        value
        |> Jason.decode()
        |> case do
          {:ok, %{} = data} -> normalize_config(data)
          _ -> @empty_config
        end
    end
  end

  def save_config(attrs) do
    with {:ok, tournament_ids} <- parse_ids(attrs["tournament_ids"] || attrs[:tournament_ids] || ""),
         {:ok, group_tournament_ids} <-
           parse_ids(attrs["group_tournament_ids"] || attrs[:group_tournament_ids] || "") do
      config = %{
        tournament_ids: tournament_ids,
        group_tournament_ids: group_tournament_ids,
        text: normalize_text(attrs["text"] || attrs[:text])
      }

      case Customization.upsert(@config_key, Jason.encode!(config)) do
        {:ok, _customization} -> {:ok, config}
        {:error, changeset} -> {:error, inspect(changeset.errors)}
      end
    end
  end

  def lookup_user(user_id) do
    with {:ok, user_id} <- parse_user_id(user_id),
         %User{} = user <- User.get(user_id) do
      config = get_config()

      {:ok,
       %{
         user: ensure_auth_token(user),
         tournaments: find_tournaments(user_id, config.tournament_ids),
         group_tournaments: find_group_tournaments(user_id, config.group_tournament_ids)
       }}
    else
      nil -> {:error, "User not found"}
      {:error, reason} -> {:error, reason}
    end
  end

  defp ensure_auth_token(%User{auth_token: token} = user) when is_binary(token) do
    if String.trim(token) == "", do: regenerate_auth_token(user), else: user
  end

  defp ensure_auth_token(%User{} = user), do: regenerate_auth_token(user)

  defp regenerate_auth_token(%User{} = user) do
    case User.reset_auth_token(user.id) do
      {:ok, updated_user} -> updated_user
      {:error, _changeset} -> user
    end
  end

  def format_ids(ids) when is_list(ids), do: Enum.join(ids, "\n")

  defp normalize_config(data) do
    %{
      tournament_ids: normalize_ids(data["tournament_ids"] || data[:tournament_ids]),
      group_tournament_ids: normalize_ids(data["group_tournament_ids"] || data[:group_tournament_ids]),
      text: normalize_text(data["text"] || data[:text])
    }
  end

  defp normalize_text(text) when is_binary(text), do: text
  defp normalize_text(_text), do: ""

  defp normalize_ids(ids) when is_list(ids) do
    ids
    |> Enum.flat_map(fn
      id when is_integer(id) and id > 0 -> [id]
      id when is_binary(id) -> id |> parse_ids() |> elem_or_empty()
      _ -> []
    end)
    |> Enum.uniq()
  end

  defp normalize_ids(_ids), do: []

  defp elem_or_empty({:ok, ids}), do: ids
  defp elem_or_empty({:error, _reason}), do: []

  defp parse_user_id(user_id) do
    case parse_ids(user_id) do
      {:ok, [id]} -> {:ok, id}
      {:ok, []} -> {:error, "Enter a user id"}
      {:ok, _ids} -> {:error, "Enter one user id"}
      {:error, reason} -> {:error, reason}
    end
  end

  defp parse_ids(value) when is_integer(value) and value > 0, do: {:ok, [value]}
  defp parse_ids(value) when is_integer(value), do: {:error, "IDs must be positive integers"}

  defp parse_ids(value) when is_binary(value) do
    tokens = String.split(value, ~r/[\s,;]+/, trim: true)

    invalid =
      Enum.reject(tokens, fn token ->
        case Integer.parse(token) do
          {id, ""} when id > 0 -> true
          _ -> false
        end
      end)

    if invalid == [] do
      ids =
        tokens
        |> Enum.map(&String.to_integer/1)
        |> Enum.uniq()

      {:ok, ids}
    else
      {:error, "IDs must be positive integers: #{Enum.join(invalid, ", ")}"}
    end
  end

  defp parse_ids(_value), do: {:error, "IDs must be positive integers"}

  defp find_tournaments(_user_id, []), do: []

  defp find_tournaments(user_id, ids) do
    Tournament
    |> where([t], t.id in ^ids)
    |> select([t], %{id: t.id, name: t.name, players: t.players})
    |> Repo.all()
    |> Enum.map(fn tournament ->
      tournament
      |> Map.delete(:players)
      |> Map.put(:present, players_include?(tournament.players, user_id))
    end)
    |> sort_by_ids(ids)
  end

  defp find_group_tournaments(_user_id, []), do: []

  defp find_group_tournaments(user_id, ids) do
    GroupTournament
    |> where([gt], gt.id in ^ids)
    |> join(:left, [gt], ugt in UserGroupTournament, on: ugt.group_tournament_id == gt.id and ugt.user_id == ^user_id)
    |> select([gt, ugt], %{
      id: gt.id,
      name: gt.name,
      user_id: ugt.user_id,
      token: ugt.token,
      present: not is_nil(ugt.id)
    })
    |> Repo.all()
    |> sort_by_ids(ids)
  end

  defp players_include?(nil, _user_id), do: false
  defp players_include?(players, user_id) when is_list(players), do: Enum.any?(players, &player_matches?(&1, user_id))

  defp players_include?(players, user_id) when is_map(players) do
    Map.has_key?(players, user_id) ||
      Map.has_key?(players, to_string(user_id)) ||
      players
      |> Map.values()
      |> players_include?(user_id)
  end

  defp players_include?(_players, _user_id), do: false

  defp player_matches?(%{id: id}, user_id), do: int_equal?(id, user_id)
  defp player_matches?(%{"id" => id}, user_id), do: int_equal?(id, user_id)
  defp player_matches?(_player, _user_id), do: false

  defp int_equal?(value, user_id) when is_integer(value), do: value == user_id

  defp int_equal?(value, user_id) when is_binary(value) do
    case Integer.parse(value) do
      {id, ""} -> id == user_id
      _ -> false
    end
  end

  defp int_equal?(_value, _user_id), do: false

  defp sort_by_ids(items, ids) do
    positions = ids |> Enum.with_index() |> Map.new()

    Enum.sort_by(items, fn item -> Map.get(positions, item.id, item.id) end)
  end
end
