<?php

register_shutdown_function(function() {
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
    )));
    exit(0);
  }
});

include 'check/solution.php';

assert_options(ASSERT_ACTIVE, 1);
assert_options(ASSERT_WARNING, 0);
assert_options(ASSERT_QUIET_EVAL, 1);

$stdout = STDERR;

while ($line = fgets(STDIN)) {
  $json = json_decode($line);

  if (isset($json->check)) {
    fwrite($stdout, json_encode(array(
      'status' => 'ok',
      'result' => $json->check
    )));
  } else {
    $result = solution(...$json->arguments);

    if (assert($result !== $json->expected)) {
      fwrite($stdout, json_encode(array(
        'status' => 'failure',
        'result' => $json->arguments
      )));
      exit(0);
    }
  }
}

?>
