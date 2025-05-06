FROM codebattle/runner-rs:latest AS runner

FROM alpine:3.21

# Install build tools and dependencies with a single RUN to reduce layers
RUN apk add --update --no-cache make git openssh-client g++ cmake ninja python3 wget ccache

# Configure ccache for maximum performance
ENV CCACHE_DIR=/ccache
ENV CCACHE_MAXSIZE=4G
ENV CCACHE_SLOPPINESS=include_file_mtime,time_macros,pch_defines,modules,system_headers
ENV CCACHE_COMPRESS=1
ENV CCACHE_COMPRESSLEVEL=6
ENV CCACHE_NOHASHDIR=1
ENV CCACHE_DIRECT=1
ENV CCACHE_FILECLONE=1
ENV CCACHE_BASEDIR=/usr/src/app
ENV PATH=/usr/lib/ccache:$PATH

WORKDIR /usr/src/app

# Download dependencies to the correct location
RUN wget -O json.hpp https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp && \
    wget -O fifo_map.hpp https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp

# Create ccache directory with proper permissions
RUN mkdir -p /ccache && chmod 777 /ccache

# Create and precompile bits/stdc++.h header
RUN echo '#include <bits/stdc++.h>' > /usr/include/precompiled_bits.hpp && \
    ccache g++ -std=c++23 -O0 -x c++-header -o /usr/include/precompiled_bits.hpp.gch /usr/include/precompiled_bits.hpp

# Add check directory, Makefile, and precompiled.hpp
ADD check ./check
ADD Makefile .
ADD precompiled.hpp .

# Precompile only the header file
RUN ccache -z && \
    # Precompile the header file
    ccache g++ -std=c++23 -O0 -x c++-header -o precompiled.hpp.gch precompiled.hpp && \
    # Show cache statistics
    ccache -s

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
