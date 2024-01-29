defmodule Codebattle.Repo.Migrations.RenameMatchesRound do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:show_results, :boolean, default: true, null: false)
      add(:task_pack_name, :string)
    end

    # tournaments =
    #   Codebattle.Repo.all(Codebattle.Tournament)
    #   |> Codebattle.Repo.preload([:creator])
    #   |> Enum.map(fn tournament ->
    #     matches =
    #       tournament.matches
    #       |> Map.keys()
    #       |> Enum.reduce(%{}, fn key, acc ->
    #         match = Map.get(tournament.matches, key)
    #         round_position = match.round
    #
    #         new_match =
    #           match
    #           |> Map.merge(%{
    #             round_position: round_position,
    #             round_id: nil
    #           })
    #
    #         Map.put(acc, key, new_match)
    #       end)
    #
    #     tournament
    #     |> Map.merge(%{matches: matches})
    #     |> Codebattle.Repo.insert!(
    #       conflict_target: :id,
    #       on_conflict: {:replace_all_except, [:id, :inserted_at]}
    #     )
    #   end)
  end
end
