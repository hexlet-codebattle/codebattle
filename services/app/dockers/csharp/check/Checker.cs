using System;
using System.IO;
using System.Globalization;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

using KellermanSoftware.CompareNetObjects;

namespace app
{
  public class Checker
  {
    public static void Test(bool success)
    {
      TextWriter oldOut = Console.Out;
      StringBuilder sb = new StringBuilder();
      TextWriter newOut = new StringWriter(sb);
      CompareLogic compareLogic = new CompareLogic();

      try {
        Solution instance = new Solution();
        long start = 0;
        double executionTime = 0;
        Console.SetOut(newOut);
        string output = "";
        IList<AssertResult> executionResults = new List<AssertResult>();


        int a1 = 1;
        int b1 = 2;
        start = DateTime.Now.Ticks;
        int result1_ = instance.solution(a1, b1);
        executionTime = (DateTime.Now.Ticks - start) / 10000.0;
        int expected1_ = 3;
        IList<object> arguments1_ = new List<object>(){ a1, b1 };
        output = GetOutputAndResetIO(sb);
        success = AssertSolution(result1_, expected1_, arguments1_, output, executionTime, executionResults, success);

        int a2 = 3;
        int b2 = 5;
        start = DateTime.Now.Ticks;
        int result2_ = instance.solution(a2, b2);
        executionTime = (DateTime.Now.Ticks - start) / 10000.0;
        int expected2_ = 8;
        IList<object> arguments2_ = new List<object>(){ a2, b2 };
        output = GetOutputAndResetIO(sb);
        success = AssertSolution(result2_, expected2_, arguments2_, output, executionTime, executionResults, success);

        Console.SetOut(oldOut);
        if (success) {
          Console.WriteLine(new StatusMessage{ status = "ok", result = "123" });
        } else {
          foreach(AssertResult message in executionResults)
          {
            Console.WriteLine(message);
          }
        }
      } catch (Exception e) {
        Console.SetOut(oldOut);
        Console.WriteLine(new StatusMessage{ status = "error", result = e.Message });
        Console.WriteLine(e);
      }
    }

    static bool AssertSolution(object result, object expected, IList<object> args, string output, double executionTime, IList<AssertResult> executionResults, CompareLogic compareLogic, bool success)
    {
      ComparisonResult assertResult = compareLogic.Compare(result, expected);

      if (assertResult.AreEqual) {
        executionResults.Add(new AssertResult
            {
            status = "success",
            result = result,
            expected = expected,
            arguments = args,
            output = output,
            executionTime = executionTime,
            });

        return success;
      }

      executionResults.Add(new AssertResult
          {
          status = "failure",
          result = result,
          expected = expected,
          arguments = args,
          output = output,
          executionTime = executionTime,
          });

      return false;
    }

    static string GetOutputAndResetIO(StringBuilder sb)
    {
      string output = sb.ToString();
      sb.Clear();
      return output;
    }

    class AssertResult
    {
      public string status { get; set; }
      public object result { get; set; }
      public object expected { get; set; }
      public IList<object> arguments { get; set; }
      public string output { get; set; }
      public double executionTime { get; set; }

      public override string ToString()
      {
        return JsonSerializer.Serialize(this);
      }
    }

    class StatusMessage
    {
      public string status { get; set; }
      public string result { get; set; }

      public override string ToString()
      {
        return JsonSerializer.Serialize(this);
      }
    }
  }
}
