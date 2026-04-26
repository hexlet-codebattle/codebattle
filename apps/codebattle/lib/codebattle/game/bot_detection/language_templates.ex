defmodule Codebattle.Game.BotDetection.LanguageTemplates do
  @moduledoc """
  Looks up the per-language solution template length so we can subtract it
  from the final-solution length when measuring how much code the player
  actually added.
  """

  alias Runner.Languages

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
