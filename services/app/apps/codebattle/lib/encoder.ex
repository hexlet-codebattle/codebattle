defmodule Encoder do
  defimpl Jason.Encoder, for: MapSet do
    def encode(map_set, opts) do
      Jason.Encode.list(MapSet.to_list(map_set), opts)
    end
  end
end
