package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	StripeSecretKey string
	UploadFolder    string
}

func LoadConfig() *Config {
    // 1. Try to load .env explicitly
    err := godotenv.Load()
    if err != nil {
        // If it fails, try loading it from the parent directory (sometimes needed for go run)
        _ = godotenv.Load("../.env") 
    }

    key := os.Getenv("STRIPE_SECRET_KEY")
    
    // DEBUG: Print if the key was found (Don't print the whole key for safety)
    if key == "" {
        println("❌ ERROR: STRIPE_SECRET_KEY is EMPTY. The .env file was not loaded.")
    } else {
        println("✅ SUCCESS: STRIPE_SECRET_KEY loaded! (starts with " + key[:7] + "...)")
    }

    return &Config{
        Port:            getEnv("PORT", "5005"),
        StripeSecretKey: key,
        UploadFolder:    "scans",
    }
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}