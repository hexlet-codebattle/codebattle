defmodule Codebattle.Game.BotDetection.Phrases do
  @moduledoc """
  Static lists of phrases that strongly indicate LLM-generated code.

  Each phrase must be:
    * lowercase
    * multi-word (avoids false positives on identifier substrings)
    * domain-rare (almost never appears in legitimate codebattle solutions)

  Add new locales by appending a list module attribute and exposing it via
  `all/0`. Tests in `test/codebattle/game/bot_detection/phrases_test.exs`
  enforce the multi-word and lowercase invariants.
  """

  @english [
    "here's the solution",
    "here is the solution",
    "this solution",
    "to solve this",
    "first, we",
    "note that",
    "let me know",
    "in summary",
    "hope this helps",
    "we can use",
    "this approach",
    "time complexity",
    "space complexity",
    "edge case",
    "step by step",
    "as you can see",
    "for example,",
    "explanation:",
    "in this code",
    "this function",
    "the function takes",
    "feel free to"
  ]

  @russian [
    "вот решение",
    "вот код",
    "это решение",
    "данное решение",
    "чтобы решить",
    "для решения",
    "обратите внимание",
    "в данном случае",
    "например,",
    "примечание:",
    "пояснение:",
    "объяснение:",
    "сложность алгоритма",
    "временная сложность",
    "по времени",
    "по памяти",
    "шаг за шагом",
    "функция принимает",
    "функция возвращает",
    "данная функция",
    "эта функция",
    "надеюсь, это поможет",
    "если что-то непонятно"
  ]

  @doc "All English LLM-tell phrases."
  @spec english() :: [String.t()]
  def english, do: @english

  @doc "All Russian LLM-tell phrases."
  @spec russian() :: [String.t()]
  def russian, do: @russian

  @doc "Every supported phrase, regardless of locale."
  @spec all() :: [String.t()]
  def all, do: @english ++ @russian
end
