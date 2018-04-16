<?php
include 'check/solution.php';

$stdin = fopen('php://stdin', 'r');

try {
	while ($line = fgets($stdin)) {
			$json = json_decode($line);

			if(isset($json->{'check'})) {
					print $json->{'check'};
			} else {
			if (solution(...$json->{'arguments'}) != $json->{'expected'}){
				throw new Exception($json->{'arguments'}[0]);
			}
			}
	}
} catch (Exception $e) {

	print json_encode([
		'status' => 'failure', 
		'result' => $e->getMessage(),
	]);

	exit(1);

} finally {
	fclose($stdin);
}
?>

