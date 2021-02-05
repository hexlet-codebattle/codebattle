package solution;

import java.io.*;
import java.util.*;

import javax.json.JsonObject;
import javax.json.Json;

public class CheckerExample {
    public static void main(String... args) {
        PrintStream oldOut = System.out;
        List<JsonObject> executionResults = new ArrayList<JsonObject>();

        try {
            SolutionExample instance = new SolutionExample();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PrintStream newOut = new PrintStream(baos);
            System.setOut(newOut);

            boolean success = true;

            long start = 0;
            long executionTime = 0;
            String output = "";

            int a1 = 1;
            int b1 = 2;
            start = System.currentTimeMillis();
            int result1 = instance.solution(a1, b1);
            executionTime = System.currentTimeMillis() - start;
            int expected1 = 3;
            output = getOutputAndResetIO(baos);
            Object[] arr1 = {a1, b1};
            List<Object> arguments1 = Arrays.asList(arr1);
            success = assertSolution(result1, expected1, output, arguments1, executionTime, executionResults, success);

            int a2 = 3;
            int b2 = 5;
            start = System.currentTimeMillis();
            int result2 = instance.solution(a2, b2);
            executionTime = System.currentTimeMillis() - start;
            int expected2 = 8;
            output = getOutputAndResetIO(baos);
            Object[] arr2 = {a2, b2};
            List<Object> arguments2 = Arrays.asList(arr2);
            success = assertSolution(result2, expected2, output, arguments2, executionTime, executionResults, success);

            if (success) {
                JsonObject okMessage = getOkMessage("__code-0__");
                executionResults.add(okMessage);
            }
        } catch (Exception e) {
            e.printStackTrace();
            String errMessage = e.getMessage();
            JsonObject errorMessage = getErrorMessage(errMessage);
            executionResults.add(errorMessage);
        }

        System.setOut(oldOut);
        print(executionResults);
    }

    private static String getOutputAndResetIO(ByteArrayOutputStream baos) {
        System.out.flush();
        String output = baos.toString();
        baos.reset();
        return output;
    }

    private static boolean assertSolution(Object result, Object expected, String output, List args, long executionTime, List<JsonObject> executionResults, boolean success) {
        boolean assertResult = expected.equals(result);

        if (assertResult) {
            JsonObject assertMessage = getAssertMessage("success", result, expected, output, args, executionTime);
            executionResults.add(assertMessage);
            return success;
        }

        JsonObject assertMessage = getAssertMessage("failure", result, expected, output, args, executionTime);
        executionResults.add(assertMessage);
        return false;
    }

    private static JsonObject getAssertMessage(String status, Object result, Object expected, String output, List args, long executionTime) {
        return Json.createObjectBuilder()
            .add("status", status)
            .add("result", result.toString())
            .add("expected", expected.toString())
            .add("output", output)
            .add("arguments", args.toString())
            .add("executionTime", executionTime)
            .build();
    }

    private static JsonObject getOkMessage(String result) {
        return Json.createObjectBuilder()
            .add("status", "ok")
            .add("result", result)
            .build();
    }

    private static JsonObject getErrorMessage(String message) {
        return Json.createObjectBuilder()
            .add("status", "error")
            .add("result", message)
            .build();
    }

    private static void print(List<JsonObject> executionResults) {
        executionResults.forEach((JsonObject message) -> System.out.println(message));
    }
}
