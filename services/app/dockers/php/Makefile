test:
	sed -e '1i<?php ' -e '$$a?>' -e 's/^/ /' -i check/solution.php
	cat check/data.jsons | php checker.php

.PHONY: test
