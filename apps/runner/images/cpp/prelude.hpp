// Self-contained prelude precompiled into /pch/all.pch and used by every
// generated checker.cpp. Replaces nlohmann/json + fifo_map.
//
// Why hand-rolled: json.hpp parses fine from the PCH, but every
//   j["value"] = result;
// in the generated checker still triggers a fresh template instantiation of
// the heaviest type-dispatch chain in modern C++. With ~20 asserts per task
// that's a meaningful fraction of per-run compile time. Our overload set
// below covers the only types tasks ever return (see languages.ex types map)
// — int, double, bool, string, vector<T>, map<string,T> and their nestings.

#include <bits/stdc++.h>

using namespace std;

namespace cb {

// Forward declarations come first so two-phase name lookup inside the
// container templates below can find every overload at instantiation time.

inline void emit_string(std::ostream& o, const char* s, std::size_t n);

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
inline void emit(std::ostream& o, double v);
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

// === definitions ===

inline void emit_string(std::ostream& o, const char* s, std::size_t n) {
  o << '"';
  for (std::size_t i = 0; i < n; ++i) {
    unsigned char c = static_cast<unsigned char>(s[i]);
    switch (c) {
      case '"':  o << "\\\""; break;
      case '\\': o << "\\\\"; break;
      case '\b': o << "\\b";  break;
      case '\f': o << "\\f";  break;
      case '\n': o << "\\n";  break;
      case '\r': o << "\\r";  break;
      case '\t': o << "\\t";  break;
      default:
        if (c < 0x20) {
          char buf[8];
          std::snprintf(buf, sizeof(buf), "\\u%04x", c);
          o << buf;
        } else {
          o << static_cast<char>(c);
        }
    }
  }
  o << '"';
}

inline void emit(std::ostream& o, bool v)               { o << (v ? "true" : "false"); }
inline void emit(std::ostream& o, short v)              { o << v; }
inline void emit(std::ostream& o, int v)                { o << v; }
inline void emit(std::ostream& o, long v)               { o << v; }
inline void emit(std::ostream& o, long long v)          { o << v; }
inline void emit(std::ostream& o, unsigned short v)     { o << v; }
inline void emit(std::ostream& o, unsigned v)           { o << v; }
inline void emit(std::ostream& o, unsigned long v)      { o << v; }
inline void emit(std::ostream& o, unsigned long long v) { o << v; }

inline void emit(std::ostream& o, double v) {
  if (std::isnan(v) || std::isinf(v)) { o << "null"; return; }
  char buf[32];
  // shortest round-trip representation
  auto [ptr, ec] = std::to_chars(buf, buf + sizeof(buf), v);
  if (ec != std::errc{}) { o << "null"; return; }
  o.write(buf, ptr - buf);
  // JSON readers treat bare integers as int; force ".0" so the value stays
  // a float on the wire (matches nlohmann::json::dump behavior).
  bool has_dot_or_exp = false;
  for (const char* p = buf; p < ptr; ++p) {
    if (*p == '.' || *p == 'e' || *p == 'E') { has_dot_or_exp = true; break; }
  }
  if (!has_dot_or_exp) o << ".0";
}
inline void emit(std::ostream& o, float v)       { emit(o, static_cast<double>(v)); }
inline void emit(std::ostream& o, long double v) { emit(o, static_cast<double>(v)); }

inline void emit(std::ostream& o, const std::string& v)  { emit_string(o, v.data(), v.size()); }
inline void emit(std::ostream& o, std::string_view v)    { emit_string(o, v.data(), v.size()); }
inline void emit(std::ostream& o, const char* v)         { emit_string(o, v, std::strlen(v)); }

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

} // namespace cb

template <typename Fn>
inline void RunTest(std::vector<std::string>& finalResults_,
                    std::stringstream& buffer_,
                    Fn&& fn) {
  auto start_ = std::chrono::high_resolution_clock::now();
  auto result_ = fn();
  std::chrono::duration<double> elapsed_ =
      std::chrono::high_resolution_clock::now() - start_;
  char timeBuf_[32];
  std::snprintf(timeBuf_, sizeof(timeBuf_), "%.7f", elapsed_.count());
  std::string output_ = buffer_.str();
  buffer_.str("");

  std::stringstream out_;
  out_ << R"({"type":"result","value":)";
  cb::emit(out_, result_);
  out_ << R"(,"output":)";
  cb::emit_string(out_, output_.data(), output_.size());
  out_ << R"(,"time":")" << timeBuf_ << R"("})";
  finalResults_.push_back(out_.str());
}

inline void SendError(std::vector<std::string>& finalResults_, const char* what) {
  std::stringstream out_;
  out_ << R"({"type":"error","value":)";
  cb::emit_string(out_, what, std::strlen(what));
  out_ << "}";
  finalResults_.push_back(out_.str());
}
