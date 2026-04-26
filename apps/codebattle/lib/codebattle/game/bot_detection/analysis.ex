defmodule Codebattle.Game.BotDetection.Analysis do
  @moduledoc """
  In-memory result of running the bot-detection pipeline for a single
  player in a single game. The `BotDetection.PlayerReport` Ecto schema is
  the persisted form of this struct.
  """

  @type level :: :none | :low | :medium | :high

  @type t :: %__MODULE__{
          game_id: pos_integer() | nil,
          user_id: pos_integer() | nil,
          score: non_neg_integer(),
          level: level(),
          signals: [String.t()],
          stats: map() | nil,
          code_analysis: map() | nil,
          final_length: non_neg_integer(),
          template_length: non_neg_integer(),
          effective_added_length: non_neg_integer(),
          final_text: String.t() | nil,
          final_lang: String.t() | nil
        }

  defstruct game_id: nil,
            user_id: nil,
            score: 0,
            level: :none,
            signals: [],
            stats: nil,
            code_analysis: nil,
            final_length: 0,
            template_length: 0,
            effective_added_length: 0,
            final_text: nil,
            final_lang: nil
end
