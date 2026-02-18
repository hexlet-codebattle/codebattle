defmodule Codebattle.Repo.Migrations.ChangeAssertsToJson do
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
