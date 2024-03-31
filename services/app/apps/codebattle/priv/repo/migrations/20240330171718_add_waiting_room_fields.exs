defmodule Codebattle.Repo.Migrations.AddWaitingRoomFields do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add(:waiting_room_name, :text)
    end
  end
end
