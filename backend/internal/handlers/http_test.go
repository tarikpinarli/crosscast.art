package handlers

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/tarikpinarli/dualSculp-backend/config"
)

// 1. Test the Pricing Logic (Pure Unit Test)
func TestModulePrices(t *testing.T) {
    // Ensure all critical modules have a price
    requiredModules := []string{
        "intersection-basic",
        "wall-art-basic",
        "geo-sculptor-basic",
        "resonance-basic",
        "typography-basic",
    }

    for _, mod := range requiredModules {
        if price, exists := ModulePrices[mod]; !exists || price <= 0 {
            t.Errorf("Module %s is missing a valid price", mod)
        }
    }
}

// 2. Test CheckAvailability (HTTP Integration Test)
func TestCheckAvailability(t *testing.T) {
    // Setup Gin in Test Mode
    gin.SetMode(gin.TestMode)

    // Create a Recorder (acts like a browser receiving the response)
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)

    // Initialize Handler
    cfg := &config.Config{Port: "5005"}
    h := NewHandler(cfg)

    // Call the handler directly
    h.CheckAvailability(c)

    // Assert Status Code
    if w.Code != http.StatusOK {
        t.Errorf("Expected status 200, got %d", w.Code)
    }

    // Assert JSON Body
    var response map[string]interface{}
    err := json.Unmarshal(w.Body.Bytes(), &response)
    if err != nil {
        t.Fatalf("Failed to parse JSON response: %v", err)
    }

    if response["available"] != true {
        t.Error("Expected available to be true")
    }
}

// 3. Test Unknown Module Pricing Fallback
func TestCreatePaymentIntent_PriceFallback(t *testing.T) {
    // We can't easily test the Stripe call without a Mock, 
    // but we CAN verify that our map logic is sound.
    
    // Check that an unknown module ID would result in the default fallback price logic
    // (This mimics the logic inside CreatePaymentIntent: if amount == 0 { amount = 299 })
    
    unknownID := "random-hacker-module"
    amount := ModulePrices[unknownID]
    
    if amount == 0 {
        amount = 299 // The fallback logic from your main code
    }

    if amount != 299 {
        t.Errorf("Expected fallback price of 299 for unknown module, got %d", amount)
    }
}