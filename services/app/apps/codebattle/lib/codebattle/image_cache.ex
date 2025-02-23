defmodule Codebattle.ImageCache do
  @moduledoc false
  use GenServer

  # 2 hours in milliseconds
  @cleanup_interval 2 * 60 * 60 * 1000

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    create_table()
    schedule_cleanup()
    {:ok, %{}}
  end

  def create_table do
    :ets.new(
      :html_images,
      [
        :set,
        :public,
        :named_table,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ]
    )
  end

  def put_image(cache_key, image) do
    :ets.insert(:html_images, {cache_key, image})
    :ok
  end

  def get_image(cache_key) do
    case :ets.lookup(:html_images, cache_key) do
      [{^cache_key, cached_image}] ->
        cached_image

      [] ->
        nil
    end
  end

  def clean_table do
    :ets.delete_all_objects(:html_images)
  end

  def handle_info(:cleanup, state) do
    clean_table()
    schedule_cleanup()
    {:noreply, state}
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end
end
