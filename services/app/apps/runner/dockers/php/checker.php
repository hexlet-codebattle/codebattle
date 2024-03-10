<?php
class Checker {
    public static function call() {
        global $execution_result;
        $execution_result = [];
        $original_stdout = fopen('php://stdout', 'w');
        $stdout = fopen('php://memory', 'w'); // Open a memory stream for capturing output
        $args_list = json_decode(file_get_contents(__DIR__ . '/check/asserts.json'), true);

        require_once __DIR__ . '/check/solution.php';

        foreach ($args_list['arguments'] as $arguments) {

            $starts_at = microtime(true);

            try {
                self::to_output([
                    'type' => 'result',
                    'value' => solution(...$arguments),
                    'time' => self::print_time($starts_at),
                ]);
            } catch (Throwable $e) {
                self::to_output([
                    'type' => 'error',
                    'value' => $e->getMessage(),
                    'time' => self::print_time($starts_at),
                ]);
            }
        }

        // Close the memory stream
        fclose($stdout);

        // Restore the original stdout
        $stdout = $original_stdout;

        // Output the result
        echo json_encode($execution_result);
    }

    public static function to_output($output) {
        global $execution_result;
        $execution_result[] = $output;
    }

    public static function print_time($time) {
        return sprintf('%05.5f', (microtime(true) - $time));
    }
}

Checker::call();
?>
