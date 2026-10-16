defmodule Codebattle.Game.BotDetection.LanguageTemplates do
  @moduledoc """
  Looks up the per-language solution template length so we can subtract it
  from the final-solution length when measuring how much code the player
  actually added.
  """

  alias Codebattle.CodeCheck
  alias Codebattle.Runner.Languages

  @doc """
  The length of the template the player's editor started from: the one generated for the
  game's task (its signature), falling back to the language's generic template.
  """
  @spec length_for(map() | nil, String.t() | nil) :: non_neg_integer()
  def length_for(%Codebattle.Task{} = task, lang) when is_binary(lang) and lang != "" do
    case Languages.meta(lang) do
      %{} = meta -> task |> CodeCheck.generate_solution_template(meta) |> String.length()
      _ -> length_for(lang)
    end
  rescue
    _ -> length_for(lang)
  end

  def length_for(_task, lang), do: length_for(lang)

  @doc """
  Returns the length (in characters) of the default solution template for
  the given language slug. Returns `0` for unknown / nil / blank langs and
  for any unexpected error from the runtime language registry.
  """
  @spec length_for(String.t() | nil) :: non_neg_integer()
  def length_for(nil), do: 0
  def length_for(""), do: 0

  def length_for(lang) when is_binary(lang) do
    case Languages.meta(lang) do
      %{solution_template: template} when is_binary(template) -> String.length(template)
      _ -> 0
    end
  rescue
    _ -> 0
  end

  def length_for(_), do: 0
end
