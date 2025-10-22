test:
	export PGPASSWORD=${POSTGRES_PASSWORD}
	psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "BEGIN TRANSACTION;" -f single_table.sql -f solution.sql -c "COMMIT;"
