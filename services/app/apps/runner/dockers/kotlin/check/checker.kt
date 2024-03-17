package solution

import kotlin.collections.*

import java.io.*
import java.util.*

import com.google.gson.Gson;

fun main(args: Array<String>) {
  var oldOut: PrintStream = System.out
  var executionResults: ArrayList<AssertResult> = ArrayList<AssertResult>()

  try {
    var baos: ByteArrayOutputStream = ByteArrayOutputStream()
    var newOut: PrintStream = PrintStream(baos)
    System.setOut(newOut)

    var start: Long
    var executionTime: Double
    var output: String

    var a1 = 1
    var b1 = 1
    var c1 = "a"
    var d1 = 1.3
    var e1 = true
    var f1 = mapOf("key1" to "val1", "key2" to "val2")
    var g1 = listOf("asdf", "fdsa")
    var h1 = listOf(listOf("Jack", "Alice"))

    start = System.nanoTime();
    var result1: Int = solution(a1, b1, c1, d1,e1, f1, g1, h1)
    executionTime = (System.nanoTime() - start) / 1_000_000_000.0
    var  time = String.format("%.7f", executionTime)
    output = getOutputAndResetIO(baos)

    var message: AssertResult = getResultMessage(result1, output, time)
    executionResults.add(message)

   System.setOut(oldOut)
   printResults(executionResults)

  } catch (e: Exception) {
    System.setOut(oldOut)
    var errMessage: ErrorMessage = getErrorMessage(e.toString())
    println(errMessage);
  }
}

fun getOutputAndResetIO(baos: ByteArrayOutputStream): String {
  System.out.flush()
  var output: String = baos.toString()
  baos.reset()
  return output
}

fun getResultMessage(result: Any, output: String, executionTime: String): AssertResult {
 return AssertResult(result, output, executionTime)
}

fun getErrorMessage(message: String): ErrorMessage {
  return ErrorMessage(message)
}

private fun printResults(executionResults: List<AssertResult>) {
    executionResults.forEach { message -> println(message) }
}

data class AssertResult(val value: Any?, val output: String, val time: String) {
    private val type = "result"
    override fun toString(): String = Gson().toJson(this)
}

data class ErrorMessage(val value: String) {
    private val type = "error"
    override fun toString(): String = Gson().toJson(this)
}
