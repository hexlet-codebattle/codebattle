defmodule Codebattle.GroupTournament.Movement do
  @moduledoc """
  Behaviour and resolver for inter-round slice reassignment strategies.

  Each strategy is a pure module that takes a list of round results
  (`%{user_id, slice_index, place}`) and returns the new `slice_index` for
  each player. Strategies must not touch the database; the caller persists
  results.
  """

  @type round_result :: %{
          required(:user_id) => integer(),
          required(:slice_index) => non_neg_integer(),
          required(:place) => pos_integer()
        }

  @type assignment :: %{
          required(:user_id) => integer(),
          required(:new_slice_index) => non_neg_integer()
        }

  @type opts :: %{
          required(:slice_count) => non_neg_integer(),
          required(:slice_size) => pos_integer(),
          optional(atom()) => term()
        }

  @callback reassign(results :: [round_result], opts) :: [assignment]

  @strategies %{
    "mirrored_cascade" => __MODULE__.MirroredCascade,
    "global_rerank" => __MODULE__.GlobalRerank,
    "neighbor_ladder" => __MODULE__.NeighborLadder
  }

  @spec resolve(String.t() | nil) :: module()
  def resolve(name) when name in [nil, ""], do: __MODULE__.MirroredCascade

  def resolve(name) when is_binary(name) do
    case Map.fetch(@strategies, name) do
      {:ok, module} -> module
      :error -> raise ArgumentError, "unknown movement strategy: #{inspect(name)}"
    end
  end

  @spec reassign(String.t(), [round_result], opts) :: [assignment]
  def reassign(strategy, results, opts) do
    resolve(strategy).reassign(results, opts)
  end

  @spec strategies() :: [String.t()]
  def strategies, do: Map.keys(@strategies)

  @doc false
  def validate_inputs!(results, opts) do
    slice_count = Map.fetch!(opts, :slice_count)
    slice_size = Map.fetch!(opts, :slice_size)

    if not is_integer(slice_count) or slice_count < 0 do
      raise ArgumentError, "slice_count must be non-negative integer, got: #{inspect(slice_count)}"
    end

    if not is_integer(slice_size) or slice_size < 1 do
      raise ArgumentError, "slice_size must be positive integer, got: #{inspect(slice_size)}"
    end

    seen =
      Enum.reduce(results, MapSet.new(), fn result, acc ->
        validate_result!(result, slice_count, slice_size)

        if MapSet.member?(acc, result.user_id) do
          raise ArgumentError, "duplicate user_id in results: #{inspect(result.user_id)}"
        end

        MapSet.put(acc, result.user_id)
      end)

    seen
  end

  defp validate_result!(%{user_id: user_id, slice_index: slice_index, place: place}, slice_count, slice_size) do
    cond do
      not is_integer(slice_index) or slice_index < 0 ->
        raise ArgumentError,
              "slice_index must be non-negative integer, got: #{inspect(slice_index)} (user_id=#{inspect(user_id)})"

      slice_count > 0 and slice_index >= slice_count ->
        raise ArgumentError,
              "slice_index #{slice_index} out of range for slice_count #{slice_count} (user_id=#{inspect(user_id)})"

      not is_integer(place) or place < 1 ->
        raise ArgumentError, "place must be positive integer, got: #{inspect(place)} (user_id=#{inspect(user_id)})"

      true ->
        _ = slice_size
        :ok
    end
  end

  defp validate_result!(other, _slice_count, _slice_size) do
    raise ArgumentError,
          "expected %{user_id, slice_index, place}, got: #{inspect(other)}"
  end
end
