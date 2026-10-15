// Self-contained prelude precompiled into /pch/all.pch and used by every
// generated checker.cpp. Replaces nlohmann/json + fifo_map.
//
// Anything heavy is *declared* here and *defined* in runtime.cpp, which is
// compiled once at image build time into /pch/runtime.o and linked against
// every per-run compile. The goal is to keep per-run codegen as small as
// possible — the user submission is the only thing we want clang doing real
// work on at request time.

#include <bits/stdc++.h>

using namespace std;

namespace cb {

// === forward declarations ===
// All overloads must be visible before any container template body so
// two-phase name lookup at instantiation finds the right specialization.

void emit_string(std::ostream& o, const char* s, std::size_t n);
void emit(std::ostream& o, double v);

inline void emit(std::ostream& o, bool v);
inline void emit(std::ostream& o, short v);
inline void emit(std::ostream& o, int v);
inline void emit(std::ostream& o, long v);
inline void emit(std::ostream& o, long long v);
inline void emit(std::ostream& o, unsigned short v);
inline void emit(std::ostream& o, unsigned v);
inline void emit(std::ostream& o, unsigned long v);
inline void emit(std::ostream& o, unsigned long long v);
inline void emit(std::ostream& o, float v);
inline void emit(std::ostream& o, long double v);
inline void emit(std::ostream& o, const std::string& v);
inline void emit(std::ostream& o, std::string_view v);
inline void emit(std::ostream& o, const char* v);

template <typename T>
inline void emit(std::ostream& o, const std::vector<T>& v);
template <typename V>
inline void emit(std::ostream& o, const std::map<std::string, V>& v);
template <typename V>
inline void emit(std::ostream& o, const std::unordered_map<std::string, V>& v);

// === inline definitions (trivial — keep header-side) ===

inline void emit(std::ostream& o, bool v)               { o << (v ? "true" : "false"); }
inline void emit(std::ostream& o, short v)              { o << v; }
inline void emit(std::ostream& o, int v)                { o << v; }
inline void emit(std::ostream& o, long v)               { o << v; }
inline void emit(std::ostream& o, long long v)          { o << v; }
inline void emit(std::ostream& o, unsigned short v)     { o << v; }
inline void emit(std::ostream& o, unsigned v)           { o << v; }
inline void emit(std::ostream& o, unsigned long v)      { o << v; }
inline void emit(std::ostream& o, unsigned long long v) { o << v; }
inline void emit(std::ostream& o, float v)       { emit(o, static_cast<double>(v)); }
inline void emit(std::ostream& o, long double v) { emit(o, static_cast<double>(v)); }
inline void emit(std::ostream& o, const std::string& v) { emit_string(o, v.data(), v.size()); }
inline void emit(std::ostream& o, std::string_view v)   { emit_string(o, v.data(), v.size()); }
inline void emit(std::ostream& o, const char* v)        { emit_string(o, v, std::strlen(v)); }

// Container templates remain inline so unusual types still compile per-run,
// but the common specializations (declared `extern template` below) are
// pre-instantiated in runtime.o.

template <typename T>
inline void emit(std::ostream& o, const std::vector<T>& v) {
  o << '[';
  bool first = true;
  for (auto const& x : v) {
    if (!first) o << ',';
    first = false;
    emit(o, x);
  }
  o << ']';
}

template <typename V>
inline void emit(std::ostream& o, const std::map<std::string, V>& m) {
  o << '{';
  bool first = true;
  for (auto const& kv : m) {
    if (!first) o << ',';
    first = false;
    emit_string(o, kv.first.data(), kv.first.size());
    o << ':';
    emit(o, kv.second);
  }
  o << '}';
}

template <typename V>
inline void emit(std::ostream& o, const std::unordered_map<std::string, V>& m) {
  o << '{';
  bool first = true;
  for (auto const& kv : m) {
    if (!first) o << ',';
    first = false;
    emit_string(o, kv.first.data(), kv.first.size());
    o << ':';
    emit(o, kv.second);
  }
  o << '}';
}

// === extern template decls ===
// These specializations are explicitly instantiated in runtime.cpp.
// Per-run TUs see them as extern and skip implicit instantiation entirely.

extern template void emit<int>                (std::ostream&, const std::vector<int>&);
extern template void emit<long long>          (std::ostream&, const std::vector<long long>&);
extern template void emit<double>             (std::ostream&, const std::vector<double>&);
extern template void emit<bool>               (std::ostream&, const std::vector<bool>&);
extern template void emit<std::string>        (std::ostream&, const std::vector<std::string>&);
extern template void emit<std::vector<int>>   (std::ostream&, const std::vector<std::vector<int>>&);
extern template void emit<std::vector<double>>(std::ostream&, const std::vector<std::vector<double>>&);
extern template void emit<std::vector<std::string>>(std::ostream&, const std::vector<std::vector<std::string>>&);

extern template void emit<int>         (std::ostream&, const std::map<std::string, int>&);
extern template void emit<long long>   (std::ostream&, const std::map<std::string, long long>&);
extern template void emit<double>      (std::ostream&, const std::map<std::string, double>&);
extern template void emit<bool>        (std::ostream&, const std::map<std::string, bool>&);
extern template void emit<std::string> (std::ostream&, const std::map<std::string, std::string>&);

} // namespace cb

// === user-facing helpers ===

// Defined in runtime.cpp.
void record_result_impl(std::vector<std::string>& finalResults_,
                        std::stringstream& buffer_,
                        std::chrono::duration<double> elapsed,
                        void (*emit_value)(std::stringstream&, void const*),
                        void const* result);

void SendError(std::vector<std::string>& finalResults_, const char* what);

// Per-call-site lambda → unique Fn type, so this template still instantiates
// per assert. Kept tiny on purpose — the heavy formatting work is done by
// record_result_impl in runtime.o, the only per-instantiation codegen is the
// timing block plus a one-line type-erasure thunk.
template <typename Fn>
inline void RunTest(std::vector<std::string>& finalResults_,
                    std::stringstream& buffer_,
                    Fn&& fn) {
  auto start_ = std::chrono::high_resolution_clock::now();
  auto result_ = fn();
  std::chrono::duration<double> elapsed_ =
      std::chrono::high_resolution_clock::now() - start_;
  using R = decltype(result_);
  record_result_impl(
      finalResults_, buffer_, elapsed_,
      +[](std::stringstream& o, void const* p) {
        cb::emit(o, *static_cast<R const*>(p));
      },
      &result_);
}
