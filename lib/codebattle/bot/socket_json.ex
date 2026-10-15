defmodule Codebattle.Bot.SocketJson do
  @moduledoc false

  defdelegate decode!(message), to: Jason

  # Phoenix validates subsequent pushes against the join_ref in the join frame.
  # PhoenixClient uses the join's ref for its pushes, but sends a nil join_ref.
  def encode!([nil, ref, topic, "phx_join", payload]) do
    Jason.encode!([ref, ref, topic, "phx_join", payload])
  end

  defdelegate encode!(message), to: Jason
end
