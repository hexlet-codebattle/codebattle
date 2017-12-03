defmodule Codebattle.Chat.Server do
    @moduledoc false

    def start_link(id) do
        GenServer.start_link(__MODULE__, [], name: chat_key(id))
    end

    defp chat_key(id) do
        {:via, :gproc, {:n, :l, {:chat, to_charlist(id)}}}
    end
end