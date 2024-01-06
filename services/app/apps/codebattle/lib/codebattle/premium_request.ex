defmodule Codebattle.PremiumRequest do
  @moduledoc """
    Represents users premium requests
  """
  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.Repo

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :status,
             :user_id
           ]}

  schema "premium_requests" do
    field(:status, :string)

    belongs_to(:user, Codebattle.User)
    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :status,
      :user_id
    ])
    |> validate_required([:status])
    |> validate_required([:user_id])
  end

  def upsert_premium_request!(user_id, status) do
    params = %{
      status: status,
      user_id: user_id
    }

    %__MODULE__{}
    |> changeset(params)
    |> Repo.insert()
  end

  def all() do
    __MODULE__
    |> Repo.all()
  end
end
