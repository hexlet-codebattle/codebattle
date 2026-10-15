package solution;

import java.io.*;
import java.util.*;
import static java.util.Map.entry;

import com.google.gson.Gson;

public class Checker {
  public static void main(String... _args) {
    PrintStream _oldOut = System.out;
    List<AssertResult> executionResults_ = new ArrayList<AssertResult>();

    try {
      Solution instance_ = new Solution();

      ByteArrayOutputStream baos_ = new ByteArrayOutputStream();
      PrintStream newOut_ = new PrintStream(baos_);
      System.setOut(newOut_);

      String time_ = "";
      long start_ = 0;
      double executionTime_ = 0;
      String output_ = "";

      Integer a1 = 1;

      Integer b1 = 1;

      String c1 = "a";

      Double d1 = 1.3;

      Boolean e1 = true;

      Map<String, String> f1 = Map.ofEntries(entry("key1", "val1"), entry("key2", "val2"));

      List<String> g1 = List.of("asdf", "fdsa");

      List<List<String>> h1 = List.of(List.of("Jack", "Alice"));

      start_ = System.nanoTime();
      Object result1_ = instance_.solution(a1, b1, c1, d1, e1, f1, g1, h1);
      executionTime_ = (System.nanoTime() - start_) / 1_000_000_000.0;
      time_ = String.format("%.7f", executionTime_);

      output_ = getOutputAndResetIO(baos_);
      executionResults_.add(new AssertResult(result1_, output_, time_));

      Integer a2 = 1;

      Integer b2 = 0;

      String c2 = "a";

      Double d2 = 1.3;

      Boolean e2 = true;

      Map<String, String> f2 = Map.ofEntries(entry("key1", "val1"), entry("key2", "val2"));

      List<String> g2 = List.of("asdf", "fdsa");

      List<List<String>> h2 = List.of(List.of("Jack", "Alice"));

      start_ = System.nanoTime();
      Object result2_ = instance_.solution(a2, b2, c2, d2, e2, f2, g2, h2);
      executionTime_ = (System.nanoTime() - start_) / 1_000_000_000.0;
      time_ = String.format("%.7f", executionTime_);

      output_ = getOutputAndResetIO(baos_);
      executionResults_.add(new AssertResult(result2_, output_, time_));

      Integer a3 = 0;

      Integer b3 = 1;

      String c3 = "a";

      Double d3 = 1.3;

      Boolean e3 = true;

      Map<String, String> f3 = Map.ofEntries(entry("key1", "val1"), entry("key2", "val2"));

      List<String> g3 = List.of("asdf", "fdsa");

      List<List<String>> h3 = List.of(List.of("Jack", "Alice"));

      start_ = System.nanoTime();
      Object result3_ = instance_.solution(a3, b3, c3, d3, e3, f3, g3, h3);
      executionTime_ = (System.nanoTime() - start_) / 1_000_000_000.0;
      time_ = String.format("%.7f", executionTime_);

      output_ = getOutputAndResetIO(baos_);
      executionResults_.add(new AssertResult(result3_, output_, time_));

      System.setOut(_oldOut);
      printResults(executionResults_);

    } catch (Exception e) {
      System.setOut(_oldOut);
      String errMessage = e.getMessage();
      var errorMessage = new ErrorMessage(errMessage);
      System.out.println(errorMessage);
    }
  }

  private static String getOutputAndResetIO(ByteArrayOutputStream baos) {
    System.out.flush();
    String output = baos.toString();
    baos.reset();
    return output;
  }

  private static void printResults(List<AssertResult> executionResults) {
    executionResults.forEach((AssertResult message) -> System.out.println(message));
  }
}

class AssertResult {
  private String type;
  private Object value;
  private String output;
  private String time;

  public AssertResult(Object value, String output, String time) {
    this.type = "result";
    this.value = value;
    this.output = output;
    this.time = time;
  }

  @Override
  public String toString() {
    return new Gson().toJson(this);
  }
}

class ErrorMessage {
  private String type;
  private String value;

  public ErrorMessage(String value) {
    this.type = "error";
    this.value = value;
  }

  @Override
  public String toString() {
    return new Gson().toJson(this);
  }
}
