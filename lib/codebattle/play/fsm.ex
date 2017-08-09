defmodule Play.Fsm do
  @moduledoc false

  use Fsm, initial_state: :initial, initial_data: %{}

  defstate initial do
    defevent create(params) do
      next_state(:waiting_opponent, params)
    end
  end

  defstate waiting_opponent do
    defevent start(params) do
      next_state(:playing)
    end
  end

  defstate playing do
    defevent won do
      next_state(:player_won)
    end
  end

  defstate player_won do
    defevent player_won do
      next_state(:over)
    end
  end

  defstate finish do
    defevent player_won do
      next_state(:over)
    end
  end
end
