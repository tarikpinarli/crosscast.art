package config

import (
    "os"
    "testing"
)

func TestLoadConfig_Defaults(t *testing.T) {
    // 1. Clear env vars to test defaults
    os.Unsetenv("PORT")
    os.Unsetenv("STRIPE_SECRET_KEY")

    cfg := LoadConfig()

    // 2. Assert Default Port
    if cfg.Port != "5005" {
        t.Errorf("Expected default port 5005, got %s", cfg.Port)
    }
}

func TestLoadConfig_CustomEnv(t *testing.T) {
    // 1. Set custom env vars
    os.Setenv("PORT", "8080")
    os.Setenv("STRIPE_SECRET_KEY", "sk_test_123")
    
    // Cleanup after test
    defer func() {
        os.Unsetenv("PORT")
        os.Unsetenv("STRIPE_SECRET_KEY")
    }()

    cfg := LoadConfig()

    // 2. Assert Custom Values
    if cfg.Port != "8080" {
        t.Errorf("Expected custom port 8080, got %s", cfg.Port)
    }
    if cfg.StripeSecretKey != "sk_test_123" {
        t.Errorf("Expected secret key sk_test_123, got %s", cfg.StripeSecretKey)
    }
}