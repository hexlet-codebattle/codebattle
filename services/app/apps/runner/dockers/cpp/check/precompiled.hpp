#ifndef PRECOMPILED_HPP
#define PRECOMPILED_HPP

#include <bits/stdc++.h>

#include "../json.hpp"
#include "../fifo_map.hpp"

template<class K, class V, class dummy_compare, class A>
using fifo_map = nlohmann::fifo_map<K, V, nlohmann::fifo_map_compare<K>, A>;
using json = nlohmann::basic_json<fifo_map>;

#endif // PRECOMPILED_HPP
