defmodule Codebattle.CheatCheck do
  require Logger
  alias Codebattle.Playbook

  def call(%Playbook{solution_type: "incomplete"}, _solution) do
    {:error, "incomplete solution"}
  end

  def call(
        %Playbook{
          winner_id: winner_id,
          winner_lang: winner_lang,
          data: data
        },
        _solution
      ) do
    start_checking()
    |> copy_paste_check(%{
      player_id: winner_id,
      player_lang: winner_lang,
      records: data.records
    })
    |> end_checking()
  end

  defp start_checking(),
    do: %{
      status: "success",
      start_time: :os.system_time(:millisecond)
    }

  defp end_checking(%{status: "success"}), do: :ok
  defp end_checking(%{status: status}), do: {:failure, status}

  defp copy_paste_check(result, %{
         player_id: id,
         player_lang: lang,
         records: records
       })
       when result.status == "success" do
    t = :os.system_time(:millisecond)
    editor_updates = Enum.filter(records, &editor_update?(&1, id, lang))
    check_result = Enum.count(editor_updates) > 5
    checking_time = :os.system_time(:millisecond) - t

    Logger.debug(
      "Finish checking solution on copy/paste, result: #{check_result}, time: #{checking_time}"
    )

    if check_result do
      result
    else
      result |> Map.put(:status, "copy/paste")
    end
  end

  defp copy_paste_check(result, _param), do: result

  defp editor_update?(record, id, lang),
    do: record.type == "update_editor_data" && record.id == id && record.diff.next_lang == lang
end
