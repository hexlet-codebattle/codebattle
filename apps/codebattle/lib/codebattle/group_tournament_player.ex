defmodule Codebattle.GroupTournamentPlayer do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTournament
  alias Codebattle.User

  @states ~w(active left)

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :group_tournament_id,
             :user_id,
             :lang,
             :state,
             :last_setup_at,
             :slice_index,
             :slice_ranking,
             :place,
             :inserted_at
           ]}

  schema "group_tournament_players" do
    belongs_to(:group_tournament, GroupTournament)
    belongs_to(:user, User)

    field(:lang, :string)
    field(:state, :string, default: "active")
    field(:last_setup_at, :utc_datetime)
    field(:slice_index, :integer)
    field(:slice_ranking, :integer)
    field(:place, :integer)

    timestamps()
  end

  def changeset(player, attrs \\ %{}) do
    player
    |> cast(attrs, [
      :group_tournament_id,
      :user_id,
      :lang,
      :state,
      :last_setup_at,
      :slice_index,
      :slice_ranking,
      :place
    ])
    |> validate_required([:group_tournament_id, :user_id, :lang, :state])
    |> validate_number(:slice_index, greater_than_or_equal_to: 0)
    |> validate_number(:place, greater_than: 0)
    |> update_change(:lang, &normalize_lang/1)
    |> validate_inclusion(:state, @states)
    |> validate_length(:lang, min: 1, max: 100)
    |> unique_constraint(:user_id, name: :group_tournament_players_group_tournament_id_user_id_index)
    |> foreign_key_constraint(:group_tournament_id)
    |> foreign_key_constraint(:user_id)
  end

  defp normalize_lang(nil), do: nil
  defp normalize_lang(lang), do: lang |> String.trim() |> String.downcase()
end
