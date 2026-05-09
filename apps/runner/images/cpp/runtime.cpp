// Compiled once at image build time into /pch/runtime.o and linked against
// every per-run checker compile. Holds the heavier non-template helpers and
// explicit template instantiations of the common emit specializations, so
// per-run codegen can stay minimal.

namespace cb {

void emit_string(std::ostream& o, const char* s, std::size_t n) {
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

void emit(std::ostream& o, double v) {
  if (std::isnan(v) || std::isinf(v)) { o << "null"; return; }
  char buf[32];
  auto [ptr, ec] = std::to_chars(buf, buf + sizeof(buf), v);
  if (ec != std::errc{}) { o << "null"; return; }
  o.write(buf, ptr - buf);
  bool has_dot_or_exp = false;
  for (const char* p = buf; p < ptr; ++p) {
    if (*p == '.' || *p == 'e' || *p == 'E') { has_dot_or_exp = true; break; }
  }
  if (!has_dot_or_exp) o << ".0";
}

template void emit<int>                            (std::ostream&, const std::vector<int>&);
template void emit<long long>                      (std::ostream&, const std::vector<long long>&);
template void emit<double>                         (std::ostream&, const std::vector<double>&);
template void emit<bool>                           (std::ostream&, const std::vector<bool>&);
template void emit<std::string>                    (std::ostream&, const std::vector<std::string>&);
template void emit<std::vector<int>>               (std::ostream&, const std::vector<std::vector<int>>&);
template void emit<std::vector<double>>            (std::ostream&, const std::vector<std::vector<double>>&);
template void emit<std::vector<std::string>>       (std::ostream&, const std::vector<std::vector<std::string>>&);

template void emit<int>                            (std::ostream&, const std::map<std::string, int>&);
template void emit<long long>                      (std::ostream&, const std::map<std::string, long long>&);
template void emit<double>                         (std::ostream&, const std::map<std::string, double>&);
template void emit<bool>                           (std::ostream&, const std::map<std::string, bool>&);
template void emit<std::string>                    (std::ostream&, const std::map<std::string, std::string>&);

} // namespace cb

void record_result_impl(std::vector<std::string>& finalResults_,
                        std::stringstream& buffer_,
                        std::chrono::duration<double> elapsed,
                        void (*emit_value)(std::stringstream&, void const*),
                        void const* result) {
  char timeBuf_[32];
  std::snprintf(timeBuf_, sizeof(timeBuf_), "%.7f", elapsed.count());
  std::string output_ = buffer_.str();
  buffer_.str("");

  std::stringstream out_;
  out_ << R"({"type":"result","value":)";
  emit_value(out_, result);
  out_ << R"(,"output":)";
  cb::emit_string(out_, output_.data(), output_.size());
  out_ << R"(,"time":")" << timeBuf_ << R"("})";
  finalResults_.push_back(out_.str());
}

void SendError(std::vector<std::string>& finalResults_, const char* what) {
  std::stringstream out_;
  out_ << R"({"type":"error","value":)";
  cb::emit_string(out_, what, std::strlen(what));
  out_ << "}";
  finalResults_.push_back(out_.str());
}
