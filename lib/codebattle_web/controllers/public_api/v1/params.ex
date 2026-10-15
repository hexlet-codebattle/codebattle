defmodule CodebattleWeb.PublicApi.V1.Params do
  @moduledoc """
  Strict body validation: unknown fields are an error (422), not silently dropped — the API
  contract is the allowlist. `spec` maps field name to `{type, opts}`.
  """

  def validate(params, spec) when is_map(params) do
    unknown = Map.keys(params) -- Map.keys(spec)

    errors =
      Enum.reduce(spec, %{}, fn {field, {type, opts}}, acc ->
        case check(Map.fetch(params, field), type, opts) do
          :ok -> acc
          {:error, message} -> Map.put(acc, field, message)
        end
      end)

    errors = Enum.reduce(unknown, errors, &Map.put(&2, &1, "is not allowed"))

    if errors == %{}, do: {:ok, Map.take(params, Map.keys(spec))}, else: {:error, errors}
  end

  def validate(_params, _spec), do: {:error, %{"body" => "must be a JSON object"}}

  defp check(:error, _type, opts), do: if(opts[:required], do: {:error, "is required"}, else: :ok)
  defp check({:ok, value}, :string, opts) when is_binary(value), do: check_length(value, opts)
  defp check({:ok, value}, :integer, opts) when is_integer(value), do: check_range(value, opts)
  defp check({:ok, value}, :boolean, _opts) when is_boolean(value), do: :ok

  defp check({:ok, value}, {:enum, values}, _opts),
    do: if(value in values, do: :ok, else: {:error, "must be one of: #{Enum.join(values, ", ")}"})

  defp check({:ok, value}, :datetime, opts) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, datetime, _offset} -> check_datetime(datetime, opts)
      _ -> {:error, "must be an ISO 8601 datetime"}
    end
  end

  defp check({:ok, _value}, type, _opts), do: {:error, "must be a #{inspect(type)}"}

  defp check_length(value, opts) do
    {min, max} = Keyword.get(opts, :length, {0, 10_000})
    if String.length(value) in min..max, do: :ok, else: {:error, "length must be #{min}..#{max}"}
  end

  defp check_range(value, opts) do
    {min, max} = Keyword.fetch!(opts, :range)
    if value in min..max, do: :ok, else: {:error, "must be in #{min}..#{max}"}
  end

  defp check_datetime(datetime, opts) do
    now = DateTime.utc_now()
    max_days = Keyword.get(opts, :max_days_ahead, 30)

    cond do
      DateTime.before?(datetime, now) -> {:error, "must be in the future"}
      DateTime.diff(datetime, now, :day) > max_days -> {:error, "must be within #{max_days} days"}
      true -> :ok
    end
  end
end
