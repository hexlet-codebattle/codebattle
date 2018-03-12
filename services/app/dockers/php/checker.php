<?php
include 'check/solution.php';

$stdin = fopen('php://stdin', 'r');

while ($line = fgets($stdin)) {
        $json = json_decode($line);
        if(isset($json->{'check'})) {
                print $json->{'check'};
        } else {
		if (solution(...$json->{'arguments'}) != $json->{'expected'}){
			exit("Wrong result");
		}
        }
}

fclose($stdin);
?>

