<?php

// echo 'Checkings is running\n';

set_error_handler(function($severity, $message, $file, $line) {
  throw new Exception('PHP error', 0, $file, $line);
});

// echo 'Checkings after error_handler\n';

$stdout = STDOUT;
$checks = array();

while ($line = fgets(STDIN)) {
  echo "Line is $line";
  array_push($checks, $line);
}

// echo 'Checkings after store checks\n';

try {
  include 'check/solution.php';

  foreach ($checks as $element) {
    if (isset($element->{'check'})) {
      fwrite($stdout, json_encode(array(
        'status' => 'ok',
        'result' => $element->{'check'}
      )));
    } else {
      $result = solution(...$json->{'arguments'});

      if ($result != $element->{'expected'}) {
        fwrite($stdout, json_encode(array(
          'status' => 'failure',
          'result' => $json->{'arguments'}
        )));
      }
    }
  }

  // while ($line = fgets(STDIN)) {
  //   $json = yield json_decode($line);
  //
  //   echo $json;
  //
  //   // if (isset($json->{'check'})) {
  //   //   echo json_encode(array(
  //   //     'status' => 'ok',
  //   //     'result' => $json->{'check'}
  //   //   ));
  //   // } else {
  //   //   echo json_encode(array(
  //   //     'status' => 'ok'
  //   //   ));
  //   //
  //   //   if (solution(...$json->{'arguments'}) != $json->{'expected'}) {
  //   //     echo json_encode(array(
  //   //       'status' => 'failure',
  //   //       'result' => $json->{'arguments'}
  //   //     ));
  //   //   }
  //   // }
  // }
} catch (Exception $e) {
  fwrite($stdout, json_encode(array(
    'status' => 'error',
    'result' => $e->getMessage()
  )));
  exit(1);
}


// try {
//   include 'check/solution.php';
//
//   while ($line = fgets(STDIN)) {
//     $json = json_decode($line);
//
//     if (isset($json->{'check'})) {
//       echo json_encode(array(
//         'status' => 'ok',
//         'result' => $json->{'check'}
//       ));
//     } else {
//       echo json_encode(array(
//         'status' => 'ok'
//       ));
//
//       if (solution(...$json->{'arguments'}) != $json->{'expected'}) {
//         echo json_encode(array(
//           'status' => 'failure',
//           'result' => $json->{'arguments'}
//         ));
//       }
//     }
//   }
// } catch (Exception $e) {
//   echo 'Exception found';
//
//   echo json_encode(array(
//     'status' => 'error',
//     'result' => $e->getMessage()
//   ));
// }

echo 'Checkings stop\n';

?>
