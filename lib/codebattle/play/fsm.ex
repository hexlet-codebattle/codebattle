defmodule Play.Fsm do
  @moduledoc false

  use Fsm, initial_state: :initial,
    initial_data: %{
      id: nil,
      first_player: nil,
      second_player: nil
    }

  defstate initial do
    defevent create(params), data: data do
      %{id: id} = params
      next_state(:new_game, %{data | id: id})
    end
  end

  defstate new_game do
    defevent add_first_player(params), data: data do
      %{first_player: first_player} = params
      next_state(:waiting_opponent, %{data | first_player: first_player})
    end
  end

  defstate waiting_opponent do
    defevent add_second_player(params), data: data do
      %{second_player: second_player} = params
      next_state(:playing, %{data | second_player: second_player})
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
end
