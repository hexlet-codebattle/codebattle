defmodule Codebattle.Repo.Migrations.ChangeAssertsToJson do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute """
     alter table tasks alter column asserts type jsonb using ('{}')
    """
  end

  def down do
    execute """
     alter table tasks alter column asserts type text;
    """
  end
end
