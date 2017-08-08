defmodule Play.Fsm do
  use Fsm, initial_state: :initial, initial_data: %{}

  defstate initial do
    defevent start do
      next_state(:waiting_opponent)
    end
  end

  defstate waiting_opponent do
    defevent start do
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
