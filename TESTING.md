Testing · MD
Copy

# Testing Strategy & Guide

This project employs a multi-layered testing strategy to ensure reliability, performance, and financial security. The testing suite is divided into **Unit Tests** for logic verification and a custom **CLI Load Tester** for performance benchmarking.

## Prerequisites
* **Go:** v1.24+
* **Stripe API Key:** A valid test key in your `.env` file (`STRIPE_SECRET_KEY`).

---

## 1. Unit Tests (Logic & Configuration)
We use the standard Go `testing` library to verify internal business logic, configuration loading, and HTTP handler responses.

### Scope
* **Configuration:** Verifies `.env` loading and default fallback values.
* **Pricing Engine:** Ensures no product is missing a price or set to zero.
* **HTTP Handlers:** Tests endpoints like `/check-availability` using `httptest` (no network required).

### How to Run
```bash
cd backend
go test ./... -v
```

### Expected Output
```
=== RUN   TestLoadConfig_Defaults
--- PASS: TestLoadConfig_Defaults (0.00s)
=== RUN   TestModulePrices
--- PASS: TestModulePrices (0.00s)
PASS
ok      github.com/tarikpinarli/dualSculp-backend/internal/handlers     0.233s
```

## 2. CLI Load Testing Tool (Performance)
Included in this repository is a custom CLI tool written in Go to stress-test the application. It supports two distinct modes to separate performance benchmarking from integration verification.

### 🚀 Mode A: Server Stress Test
Benchmarks the internal Go runtime performance by hammering the health-check endpoint. This validates the concurrency model of the backend.

**Command:**
```bash
# Runs 2000 requests with 100 concurrent users
go run cmd/loadtest/main.go -target=server -n=2000 -c=100
```

**Typical Result (Localhost):**
* Throughput: ~10,000 req/sec
* Latency: < 100ms (Total Batch)
* Failures: 0

### 💳 Mode B: Stripe Connection Check
Verifies the integration with the Stripe Payment Gateway.

* **Safety Lock:** Concurrency is strictly limited to 1 and requests to 5 to prevent API rate-limiting or banning.
* **Validation:** Confirms that the STRIPE_SECRET_KEY is valid and the backend can create a real PaymentIntent.

**Command:**
```bash
go run cmd/loadtest/main.go -target=stripe
```

**Expected Output:**
```
💳 MODE: STRIPE CONNECTION CHECK
⚠️  WARNING: This hits the REAL Stripe API. Keeping concurrency low.
✅ Success: 5
❌ Failed:  0
🎉 System is HEALTHY.
```

## 3. Manual Verification Steps
For full end-to-end verification of the frontend modules:

1. **Start the full stack:**
   - Frontend: `npm run dev`
   - Backend: `go run cmd/api/main.go`

2. Navigate to http://localhost:5173.

3. **Test "Shadow Caster":** Upload two images and ensure the intersection mesh generates.

4. **Test Export:** Click "Export 3D Model".

5. **Verify:** The Stripe Payment Modal appears.

6. **Verify:** Entering test card details (4242...) results in a successful download prompt.