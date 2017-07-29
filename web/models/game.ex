defmodule Codebattle.Game do
  use Codebattle.Web, :model

 use EctoStateMachine,
    states: [:initial, :waiting_oponent, :playing, :one_player_won, :finished],
    events: [
      [
        name:     :create,
        from:     [:initial],
        to:       :waiting_oponent,
      ], [
        name:     :start,
        from:     [:waiting_oponent],
        to:       :playing,
      ], [
        name:     :won,
        from:     [:playing],
        to:       :one_player_won,
      ], [
        name:     :finish,
        from:     [:one_player_won],
        to:       :finished,
      ]
    ]

  schema "games" do
    field :state, :string, default: "initial"

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [])
    |> validate_required([])
  end
end
