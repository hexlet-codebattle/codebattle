defmodule PhoenixGon.Storage do
  @moduledoc """
  Main struct that is keep as storage in conn for gon variabeles.
  """

  @doc false
  defstruct env: nil,
            assets: %{},
            compatibility: :native,
            namespace: nil,
            camel_case: false
end
