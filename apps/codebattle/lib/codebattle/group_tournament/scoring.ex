defmodule Codebattle.GroupTournament.Scoring do
  @moduledoc """
  Behaviour and resolver for tournament round-point scoring strategies.

  A strategy is a pure module that maps `(slice_index, place, opts)` to
  a non-negative integer of points. Strategies must not touch the database;
  the caller persists results.
  """

  @type opts :: %{
          required(:slice_count) => non_neg_integer(),
          required(:slice_size) => pos_integer(),
          required(:max_score) => non_neg_integer(),
          optional(:place_weight) => pos_integer(),
          optional(atom()) => term()
        }

  @callback round_points(slice_index :: non_neg_integer(), place :: pos_integer(), opts) ::
              non_neg_integer()

  @callback max_tournament_score(slice_rounds_count :: non_neg_integer(), opts) :: non_neg_integer()

  @strategies %{
    "diagonal_quadratic" => __MODULE__.DiagonalQuadratic,
    "diagonal_linear" => __MODULE__.DiagonalLinear,
    "global_linear" => __MODULE__.GlobalLinear
  }

  @spec resolve(String.t() | nil) :: module()
  def resolve(name) when name in [nil, ""], do: __MODULE__.DiagonalQuadratic

  def resolve(name) when is_binary(name) do
    case Map.fetch(@strategies, name) do
      {:ok, module} -> module
      :error -> raise ArgumentError, "unknown scoring strategy: #{inspect(name)}"
    end
  end

  @spec round_points(String.t(), non_neg_integer(), pos_integer(), opts) :: non_neg_integer()
  def round_points(strategy, slice_index, place, opts) do
    resolve(strategy).round_points(slice_index, place, opts)
  end

  @spec max_tournament_score(String.t(), non_neg_integer(), opts) :: non_neg_integer()
  def max_tournament_score(strategy, slice_rounds_count, opts) do
    resolve(strategy).max_tournament_score(slice_rounds_count, opts)
  end

  @spec strategies() :: [String.t()]
  def strategies, do: Map.keys(@strategies)

  @doc false
  def validate_inputs!(slice_index, place, opts) do
    slice_count = Map.fetch!(opts, :slice_count)
    slice_size = Map.fetch!(opts, :slice_size)

    cond do
      not is_integer(slice_index) or slice_index < 0 ->
        raise ArgumentError, "slice_index must be a non-negative integer, got: #{inspect(slice_index)}"

      not is_integer(place) or place < 1 ->
        raise ArgumentError, "place must be a positive integer, got: #{inspect(place)}"

      slice_count > 0 and slice_index >= slice_count ->
        raise ArgumentError,
              "slice_index #{slice_index} out of range for slice_count #{slice_count}"

      true ->
        clamp_place(place, slice_size)
    end
  end

  defp clamp_place(place, slice_size) when place > slice_size, do: slice_size
  defp clamp_place(place, _slice_size), do: place
end
