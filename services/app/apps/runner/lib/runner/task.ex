defmodule Runner.Task do
  use Ecto.Schema

  import Ecto.Changeset

  @derive Jason.Encoder

  @type t :: %__MODULE__{}

  @fields [:input_signature, :output_signature, :asserts]
  @primary_key false
  embedded_schema do
    field(:input_signature, {:array, AtomizedMap}, default: [])
    field(:output_signature, AtomizedMap, default: %{})
    field(:asserts, {:array, AtomizedMap}, default: [])
  end

  @spec new!(params :: map()) :: t()
  def new!(params = %_{}), do: params |> Map.from_struct() |> new!()

  def new!(params = %{}) do
    %__MODULE__{}
    |> cast(params, @fields)
    |> validate_required(@fields)
    |> apply_action!(:validate)
  end
end
