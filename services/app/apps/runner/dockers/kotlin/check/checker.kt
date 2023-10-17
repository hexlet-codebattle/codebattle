package solution

import kotlin.collections.*

import java.io.*
import java.util.*
import org.json.simple.*


fun main(args: Array<String>) {
  var oldOut: PrintStream = System.out
  var executionResults: ArrayList<LinkedHashMap<String, Any>> = ArrayList<LinkedHashMap<String, Any>>()

  try {
    var baos: ByteArrayOutputStream = ByteArrayOutputStream()
    var newOut: PrintStream = PrintStream(baos)
    System.setOut(newOut)

    var success: Boolean = true

    var start: Long
    var executionTime: Long
    var output: String

    var a1: Int = 1
    var b1: Int = 2
    start = System.currentTimeMillis()
    var result1: Int = solution(a1, b1)
    executionTime = System.currentTimeMillis() - start
    var expected1: Int = 3
    output = getOutputAndResetIO(baos)
    var args1 = mutableListOf(a1, b1)
    success = assertSolution(result1, expected1, output, args1, executionTime, executionResults, success)

    var a2: Int = 4
    var b2: Int = 6
    start = System.currentTimeMillis()
    var result2: Int = solution(a2, b2)
    executionTime = System.currentTimeMillis() - start
    var expected2: Int = 10
    output = getOutputAndResetIO(baos)
    var args2 = mutableListOf(a2, b2)
    success = assertSolution(result2, expected2, output, args2, executionTime, executionResults, success)

    if (success) {
      var okMessage: LinkedHashMap<String, Any> = getOkMessage("__code-0__")
      executionResults.add(okMessage)
    }

  } catch (e: Exception) {
    e.printStackTrace()
    var errMessage: LinkedHashMap<String, Any> = getErrorMessage(e.toString())
    executionResults.add(errMessage)
  }

  System.setOut(oldOut)
  executionResults.forEach { message -> println(JSONValue.toJSONString(message)) }
}

fun assertSolution(result: Any, expected: Any, output: String, args: List<Any>, executionTime: Long, executionResults: ArrayList<LinkedHashMap<String, Any>>, success: Boolean): Boolean {
  var status: Boolean = expected.equals(result)
  if (status) {
    var assertMessage: LinkedHashMap<String, Any> = getAssertMessage("success", result, expected, output, args, executionTime)
    executionResults.add(assertMessage)
    return success
  }

  var assertMessage: LinkedHashMap<String, Any> = getAssertMessage("failure", result, expected, output, args, executionTime)
  executionResults.add(assertMessage)
  return false
}

fun getOutputAndResetIO(baos: ByteArrayOutputStream): String {
  System.out.flush()
  var output: String = baos.toString()
  baos.reset()
  return output
}

fun getAssertMessage(status: String, result: Any, expected: Any, output: String, args: List<Any>, executionTime: Long): LinkedHashMap<String, Any> {
  var message: LinkedHashMap<String, Any> = LinkedHashMap<String, Any>()

  message.put("status", status)
  message.put("result", result.toString())
  message.put("expected", expected.toString())
  message.put("output", output)
  message.put("arguments", args.toString())
  message.put("executionTime", executionTime)

  return message
}

fun getErrorMessage(result: String): LinkedHashMap<String, Any> {
  var message: LinkedHashMap<String, Any> = LinkedHashMap<String, Any>()

  message.put("status", "error")
  message.put("result", result)

  return message
}

fun getOkMessage(code: String): LinkedHashMap<String, Any> {
  var message: LinkedHashMap<String, Any> = LinkedHashMap<String, Any>()

  message.put("status", "ok")
  message.put("result", code)

  return message
}
