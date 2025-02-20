defmodule Codebattle.Utils.PopulateUsersTest do
  use Codebattle.DataCase, async: true

  test "from_csv" do
    csv = """
    name,password
    user1,p@ssw0rd!
    user2,adminadmin1234
    user3,changem3
    user4,"hop hey lala ley"
    """

    {fd, path} = Temp.open!()
    IO.write(fd, csv)
    File.close(fd)

    assert {4, nil} = Codebattle.Utils.PopulateUsers.from_csv(path)
    assert %{name: "user1"} = Codebattle.User.authenticate("user1", "p@ssw0rd!")
  end
end
