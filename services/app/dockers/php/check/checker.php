<?php

error_reporting(E_ERROR | E_PARSE);
ini_set('assert.exception', '1');
ini_set('assert.warning', '0');
ini_set('assert.active', '1');

register_shutdown_function(function () {
  $stdout = STDERR;
  $last_error = error_get_last();
  $errors = array(E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR);

  if (in_array($last_error['type'], $errors)) {
    if (isset($last_error['message'])) {
      list($message) = explode(PHP_EOL, $last_error['message']);
    } else {
      $message = $last_error['message'];
    }

    fwrite($stdout, json_encode(array(
      'status' => 'error',
      'result' => $message
    )) . "\n");
    exit(0);
  }
});

$stdout = STDERR;

$success = true;
$final_result = array();

function equals($a, $b)
{
  $typeA = gettype($a);
  $typeB = gettype($b);

  if ($typeA == 'integer')
    $typeA = 'double';

  if ($typeB == 'integer')
    $typeB = 'double';

  if ($typeA != $typeB)
    return false;

  return $a == $b;
}

function assert_result($result, $expected, $args, $execution_time, &$final_result, $output, $success)
{
  try {
    assert(equals($result, $expected));

    array_push($final_result, json_encode(array(
      'status' => 'success',
      'result' => $result,
      'expected' => $expected,
      'arguments' => $args,
      'execution_time' => $execution_time,
      'output' => $output
    )) . "\n");
    return $success;
  } catch (AssertionError $e) {
    array_push($final_result, json_encode(array(
      'status' => 'failure',
      'result' => $result,
      'expected' => $expected,
      'arguments' => $args,
      'execution_time' => $execution_time,
      'output' => $output
    )) . "\n");
    return false;
  }
}

include './check/solution.php';


$start = microtime(true);
ob_start();
$result = solution(1, 2);
$output = ob_get_clean();
$execution_time = microtime(true) - $start;
$success = assert_result($result, 3, array(1, 2), $execution_time, $final_result, $output, $success);

$start = microtime(true);
ob_start();
$result = solution(3, 4);
$output = ob_get_clean();
$execution_time = microtime(true) - $start;
$success = assert_result($result, 7, array(3, 4), $execution_time, $final_result, $output, $success);

if ($success) {
  array_push($final_result, json_encode(array(
    'status' => 'ok',
    'result' => "lolkek"
  )) . "\n");
}

foreach ($final_result as &$message) {
  fwrite($stdout, $message);
}
