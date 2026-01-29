package main

import (
	"bytes"
	"flag"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// CONFIGURATION CONSTANTS
const (
	URL_Availability = "http://localhost:5005/check-availability"
	URL_Stripe       = "http://localhost:5005/create-payment-intent"
)

func main() {
	// 1. Define Command Line Flags
	target := flag.String("target", "server", "Mode: 'server' (Stress Test) or 'stripe' (Connection Check)")
	requests := flag.Int("n", 100, "Total number of requests")
	concurrency := flag.Int("c", 10, "Number of concurrent users")
	flag.Parse()

	// 2. Select Mode
	switch *target {
	case "server":
		fmt.Println("\n📢 MODE: SERVER STRESS TEST")
		fmt.Println("Testing internal Go performance. No external APIs.")
		runLoadTest(URL_Availability, *requests, *concurrency, "GET")

	case "stripe":
		fmt.Println("\n💳 MODE: STRIPE CONNECTION CHECK")
		fmt.Println("⚠️  WARNING: This hits the REAL Stripe API. Keeping concurrency low.")
		// Safety Override: Never hammer Stripe by accident
		safeRequests := 5
		safeConcurrency := 1
		fmt.Printf("🔒 Safety Limit Applied: Running %d requests with %d concurrency.\n", safeRequests, safeConcurrency)
		runLoadTest(URL_Stripe, safeRequests, safeConcurrency, "POST")

	default:
		fmt.Println("❌ Unknown target. Use -target=server or -target=stripe")
	}
}

func runLoadTest(url string, total int, concurrent int, method string) {
	fmt.Printf("🚀 Target: %s\n", url)
	start := time.Now()
	var wg sync.WaitGroup
	results := make(chan int, total)

	requestsPerWorker := total / concurrent
	
	// Launch Workers
	for i := 0; i < concurrent; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < requestsPerWorker; j++ {
				if method == "POST" {
					results <- makePostRequest(url)
				} else {
					results <- makeGetRequest(url)
				}
			}
		}()
	}

	wg.Wait()
	close(results)
	duration := time.Since(start)

	// Analyze
	success := 0
	fail := 0
	for code := range results {
		if code == 200 {
			success++
		} else {
			fail++
		}
	}

	// Report
	printReport(success, fail, duration, total)
}

// --- HELPER FUNCTIONS ---

func makeGetRequest(url string) int {
	resp, err := http.Get(url)
	if err != nil { return 0 }
	defer resp.Body.Close()
	return resp.StatusCode
}

func makePostRequest(url string) int {
	// JSON body for 'intersection-basic' module
	jsonBody := []byte(`{"moduleId": "intersection-basic"}`)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil { return 0 }
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil { return 0 }
	defer resp.Body.Close()
	return resp.StatusCode
}

func printReport(success, fail int, duration time.Duration, total int) {
	fmt.Println("\n📊 --- TEST RESULTS ---")
	fmt.Printf("✅ Success: %d\n", success)
	fmt.Printf("❌ Failed:  %d\n", fail)
	fmt.Printf("⏱️  Time:    %v\n", duration)
	
	rps := float64(total) / duration.Seconds()
	fmt.Printf("⚡ Speed:   %.2f req/sec\n", rps)

	if fail > 0 {
		fmt.Println("\n⚠️  Note: Failures in Stripe mode usually mean Invalid API Key.")
	} else {
		fmt.Println("\n🎉 System is HEALTHY.")
	}
}