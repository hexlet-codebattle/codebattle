defmodule Codebattle.Analitics do
  @moduledoc "Module for store user_events and create statistics"

  alias Codebattle.{Repo, UserEvent}

  def store_user_events(events) do
    Repo.insert_all(UserEvent, events)
  end
end
