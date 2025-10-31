package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"time"
)

type result struct {
	Type   string `json:"type"`
	Value  any    `json:"value"`
	Time   string `json:"time"`
	Output string `json:"output,omitempty"`
}

func main() {
	var (
		start_   time.Time
		result_  result
		reader_  *os.File
		writer_  *os.File
		err_     error
		elapsed_ time.Duration

		stdout_  = os.Stdout
		encoder_ = json.NewEncoder(os.Stdout)
		results_ = make([]result, 0, 10)
	)

	result_.Type = "result"

	var a1 int = 1

	var b1 int = 1

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a1, b1)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a2 int = 2

	var b2 int = 2

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a2, b2)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a3 int = 1

	var b3 int = 2

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a3, b3)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a4 int = 3

	var b4 int = 2

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a4, b4)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a5 int = 5

	var b5 int = 1

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a5, b5)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a6 int = 10

	var b6 int = 0

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a6, b6)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a7 int = 20

	var b7 int = 2

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a7, b7)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a8 int = 10

	var b8 int = 2

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a8, b8)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a9 int = 30

	var b9 int = 2

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a9, b9)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	var a10 int = 50

	var b10 int = 1

	reader_, writer_, err_ = os.Pipe()
	if err_ != nil {
		fmt.Fprintf(os.Stderr, "Error creating pipe: %v", err_)
	} else {
		os.Stdout = writer_
	}
	start_ = time.Now()
	result_.Value = solution(a10, b10)
	elapsed_ = time.Since(start_)
	result_.Time = fmt.Sprintf("%.7f", float64(elapsed_.Nanoseconds())/float64(time.Second))

	if writer_ != nil {
		writer_.Close()
	}
	if reader_ != nil {
		var outBytes_ []byte
		outBytes_, err_ = io.ReadAll(reader_)
		if err_ == nil {
			result_.Output = string(outBytes_)
		}
		reader_.Close()
	}
	results_ = append(results_, result_)

	if err_ = encoder_.Encode(results_); err_ != nil {
		fmt.Fprintln(stdout_, "Marshaler error")
	}
}
