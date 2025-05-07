########################################
# 1) builder – create the mega-PCH     #
########################################
FROM alpine:3.21 AS pch-builder

RUN apk add --no-cache clang mold lld libc++ make

# grab the single-header libraries
RUN wget -qO /usr/include/json.hpp \
        https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp \
 && wget -qO /usr/include/fifo_map.hpp \
        https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp

# compose a header that pulls everything heavy
RUN mkdir /pch && \
    printf '#include <bits/stdc++.h>\n#include "json.hpp"\n#include "fifo_map.hpp"\n' \
           > /pch/all.hpp

# compile it once with the exact flags we’ll use later
RUN clang++ -std=c++23 -O0 -x c++-header /pch/all.hpp -o /pch/all.pch

########################################
# 2) runtime – super-light layer       #
########################################
FROM alpine:3.21

RUN apk add --no-cache clang mold lld libc++ make

# copy headers + PCH
COPY --from=pch-builder /usr/include/json.hpp   /usr/include/json.hpp
COPY --from=pch-builder /usr/include/fifo_map.hpp /usr/include/fifo_map.hpp
COPY --from=pch-builder /pch/all.pch            /pch/all.pch
COPY --from=pch-builder /pch/all.hpp            /pch/all.hpp


# working dir for mounted code
WORKDIR /usr/src/app

ADD check .
ADD Makefile .

# keep your inherited runner binary
COPY --from=codebattle/runner-rs:latest /app/codebattle_runner /runner/codebattle_runner
