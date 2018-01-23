defmodule Codebattle.Bot.Diff do
  @moduledoc false

  defstruct delta: TextDelta.new([]), lang: :js, time: nil, diff: []
end
