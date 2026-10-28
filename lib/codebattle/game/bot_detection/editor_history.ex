defmodule Codebattle.Game.BotDetection.EditorHistory do
  @moduledoc """
  The server's own record of each player's editor: the text updates it received
  (`editor:data`, sent by the client at most every 250 ms), replayed from the
  game's playbook. This confirms what code reached the server, not how it was
  entered: network gaps, undo and editor commands can also create large updates.

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
    snapshot(game).summaries
  end

  @doc "Read the replay once, keeping code and evidence at the same competitive boundary."
  def snapshot(game) do
    records = records(game)
    completed = Map.get(game, :state) in ["game_over", "timeout"]

    markers =
      if completed and is_nil(Map.get(game, :tournament_id)),
        do: ["game_over", "timeout", "give_up"],
        else: ["game_over", "timeout"]

    competitive = Enum.take_while(records, &(type(&1) not in markers))
    {texts, summaries} = Enum.reduce(competitive, {%{}, %{}}, &replay(&1, &2, Map.get(game, :task)))
    %{texts: texts, summaries: summaries}
  end

  @doc "Same, from records in playbook order (oldest first)."
  @spec summarize_records([map()], map() | nil) :: %{optional(integer()) => summary()}
  def summarize_records(records, task \\ nil) do
    {_texts, summaries} = Enum.reduce(competitive_records(records), {%{}, %{}}, &replay(&1, &2, task))
    summaries
  end

  defp competitive_records(records), do: Enum.take_while(records, &(type(&1) not in ["game_over", "timeout"]))

  # `texts`: each player's editor text and language so far.
  defp replay(record, {texts, summaries}, task) do
    case {type(record), get(record, :id)} do
      {"init", id} when not is_nil(id) ->
        {Map.put(texts, id, {get(record, :editor_text) || "", get(record, :editor_lang)}), summaries}

      {kind, id} when kind in ["update_editor_data", "check_complete"] and not is_nil(id) ->
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

  # Inserted non-whitespace characters; unchanged text between separate edits is excluded.
  @doc false
  def added_chars(before, next) do
    before
    |> String.myers_difference(next)
    |> Enum.reduce(0, fn
      {:ins, text}, count -> count + (text |> String.split() |> Enum.join() |> String.length())
      _, count -> count
    end)
  end

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
