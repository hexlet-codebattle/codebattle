defmodule Codebattle.Chat.Supervisor do
    @moduledoc false

    use Supervisor
    
    def start_link do
        Supervisor.start_link(__MODULE__, [], name: __MODULE__)
    end

    def start_chat(id) do
        Supervisor.start_child(__MODULE__, [id])
    end

    def init(_) do
        children = [
            worker(Codebattle.Chat.Server, [])
        ]
        supervise(children, strategy: :simple_one_for_one)
    end
end