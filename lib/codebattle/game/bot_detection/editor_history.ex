defmodule Codebattle.Game.BotDetection.EditorHistory do
  @moduledoc """
  The server's own record of each player's editor: the text updates it received
  (`editor:data`, sent by the client at most every 250 ms), replayed from the
  game's playbook. Unlike the client telemetry it can't be faked by sending
  made-up summaries: code that shows up here without the keystrokes to match was
  not typed in the editor.

  Per player it reports how many updates came in and the largest jump: the most
  non-whitespace characters one update added. Language switches and resets to
  the task template replace the whole text and are skipped.

  Records come from the live game process while it runs (raw records carrying
  the whole text), else from the stored playbook (diffs).
  """

  alias Codebattle.CodeCheck
  alias Codebattle.Game
  alias Codebattle.Playbook
  alias Codebattle.Repo
  alias Codebattle.Runner.Languages

  @type summary :: %{updates: non_neg_integer(), max_jump: non_neg_integer()}

  @doc "A `summary` per player id, for players with editor records in the game."
  @spec summarize(map()) :: %{optional(integer()) => summary()}
  def summarize(game) do
    game
    |> records()
    |> summarize_records(Map.get(game, :task))
  end

  @doc "Same, from records in playbook order (oldest first)."
  @spec summarize_records([map()], map() | nil) :: %{optional(integer()) => summary()}
  def summarize_records(records, task \\ nil) do
    {_texts, summaries} = Enum.reduce(records, {%{}, %{}}, &replay(&1, &2, task))
    summaries
  end

  # `texts`: each player's editor text and language so far.
  defp replay(record, {texts, summaries}, task) do
    case {type(record), get(record, :id)} do
      {"init", id} when not is_nil(id) ->
        {Map.put(texts, id, {get(record, :editor_text) || "", get(record, :editor_lang)}), summaries}

      {"update_editor_data", id} when not is_nil(id) ->
        {before, lang} = Map.get(texts, id, {"", nil})
        {next, next_lang} = next_text(record, before, lang)
        {Map.put(texts, id, {next, next_lang}), count_update(summaries, id, jump(before, next, lang, next_lang, task))}

      _ ->
        {texts, summaries}
    end
  end

  defp jump(before, next, lang, lang, task), do: if(template?(next, task, lang), do: 0, else: added_chars(before, next))
  defp jump(_before, _next, _lang, _next_lang, _task), do: 0

  defp count_update(summaries, id, jump) do
    summary = Map.get(summaries, id, %{updates: 0, max_jump: 0})
    Map.put(summaries, id, %{summary | updates: summary.updates + 1, max_jump: max(summary.max_jump, jump)})
  end

  defp records(%{id: id, is_live: true}) do
    case Game.Server.get_playbook_records(id) do
      {:ok, records} -> Enum.reverse(records)
      _ -> []
    end
  catch
    :exit, _ -> []
  end

  defp records(%{id: id}) do
    case Repo.get_by(Playbook, game_id: id) do
      %Playbook{data: %{records: records}} when is_list(records) -> records
      _ -> []
    end
  end

  # Raw (live) records carry the whole text; stored ones a delta from the previous text.
  defp next_text(record, before, lang) do
    case get(record, :diff) do
      %{} = diff ->
        {apply_delta(before, get(diff, :delta) || []), get(diff, :next_lang) || lang}

      _ ->
        {get(record, :editor_text) || before, get(record, :editor_lang) || lang}
    end
  end

  @doc false
  def apply_delta(text, ops) do
    {out, rest} =
      Enum.reduce(ops, {[], text}, fn op, {out, rest} ->
        cond do
          retain = get(op, :retain) -> {[String.slice(rest, 0, retain) | out], String.slice(rest, retain..-1//1)}
          delete = get(op, :delete) -> {out, String.slice(rest, delete..-1//1)}
          insert = get(op, :insert) -> {[insert | out], rest}
          true -> {out, rest}
        end
      end)

    IO.iodata_to_binary([Enum.reverse(out), rest])
  end

  # Non-whitespace characters of the text that replaced the changed middle part.
  @doc false
  def added_chars(before, next) do
    prefix = char_start(next, :binary.longest_common_prefix([before, next]), -1)
    max_suffix = min(byte_size(before), byte_size(next)) - prefix
    suffix = min(:binary.longest_common_suffix([before, next]), max_suffix)
    # The common parts are byte runs: move both cuts to character starts.
    suffix = byte_size(next) - char_start(next, byte_size(next) - suffix, 1)
    middle = binary_part(next, prefix, byte_size(next) - prefix - suffix)

    middle |> String.split() |> Enum.join() |> String.length()
  end

  # The nearest offset (stepping by `step`) that doesn't fall inside a UTF-8 character.
  defp char_start(text, offset, step) do
    if offset > 0 and offset < byte_size(text) and continuation?(:binary.at(text, offset)),
      do: char_start(text, offset + step, step),
      else: offset
  end

  defp continuation?(byte), do: Bitwise.band(byte, 0xC0) == 0x80

  defp template?(_text, nil, _lang), do: false
  defp template?(_text, _task, nil), do: false

  defp template?(text, %Codebattle.Task{} = task, lang) do
    text == CodeCheck.generate_solution_template(task, Languages.meta(lang))
  rescue
    _ -> false
  end

  defp template?(_text, _task, _lang), do: false

  defp type(record), do: record |> get(:type) |> to_string()

  defp get(map, key) when is_map(map), do: Map.get(map, key, Map.get(map, Atom.to_string(key)))
  defp get(_map, _key), do: nil
end
