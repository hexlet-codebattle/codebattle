defmodule Codebattle.AssertsService do
  @moduledoc """
  Asserts service for tasks (validation and generation).
  """

  require Logger

  alias Runner.Languages
  alias Codebattle.AssertsService.Executor
  alias Codebattle.AssertsService.Executor.Token
  alias Codebattle.AssertsService.OutputParser
  alias Codebattle.AssertsService.Result

  @type executor :: Executor.Local | Executor.Fake | Executor.Remote

  @doc """
  Generate asserts.
  """
  @spec generate_asserts(Codebattle.Task.t(), String.t(), String.t(), String.t()) :: Result.t()
  def generate_asserts(task, solution_text, arguments_generator_text, lang_slug) do
    lang_meta = Languages.meta(lang_slug)

    token =
      Token
      |> struct(%{
        task: task,
        solution_text: solution_text,
        arguments_generator_text: arguments_generator_text,
        lang_meta: lang_meta,
        executor: get_executor()
      })
      |> execute()
      |> parse_output()

    token.result
  end

  defp execute(token) do
    {execution_time, new_token} = :timer.tc(fn -> token.executor.call(token) end)
    execution_time_msec = div(execution_time, 1_000)

    Logger.info(
      "Finished execution for lang: #{token.lang_meta.slug}, task: #{token.task.name}, time: #{execution_time_msec} msecs"
    )

    %{new_token | execution_time_msec: execution_time_msec}
  end

  defp parse_output(token) do
    %{token | result: OutputParser.call(token)}
  end

  defp get_executor, do: Application.fetch_env!(:codebattle, :asserts_executor)

  @doc """
  Validates asserts.
  """
  @spec valid_asserts?(any(), any()) :: boolean()
  def valid_asserts?([], _), do: false
  def valid_asserts?([[]], _), do: false

  def valid_asserts?(asserts, dest) when is_map(dest) do
    typed_asserts = type_asserts(asserts)
    prepared_dest = [Map.delete(dest, "argument-name")]

    typed_asserts == prepared_dest
  end

  def valid_asserts?(asserts, dest) do
    typed_asserts = type_asserts(asserts)
    prepared_dest = dest |> Enum.map(&Map.delete(&1, "argument-name"))

    typed_asserts == prepared_dest
  end

  @doc """
  Extract types from passed asserts.
  """
  @spec type_asserts([any()]) :: any()
  def type_asserts(asserts) do
    asserts |> Enum.map(&get_type/1)
  end

  defp get_type(element) when is_map(element) do
    value = element |> Map.values() |> hd
    %{"name" => "hash", "nested" => get_type(value)}
  end

  defp get_type(element) when is_list(element) do
    value = hd(element)
    %{"name" => "array", "nested" => get_type(value)}
  end

  defp get_type(element) when is_integer(element), do: %{"name" => "integer"}
  defp get_type(element) when is_bitstring(element), do: %{"name" => "string"}
  defp get_type(element) when is_float(element), do: %{"name" => "float"}
  defp get_type(element) when is_boolean(element), do: %{"name" => "boolean"}
end
