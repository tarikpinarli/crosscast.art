package config

import (
    "os"
    "github.com/joho/godotenv"
)

type Config struct {
    Port            string
    TripoAPIKey     string
    ImgBBAPIKey     string
    StripeSecretKey string
    UploadFolder    string
}

func LoadConfig() *Config {
    _ = godotenv.Load()

    return &Config{
        Port:            getEnv("PORT", "5005"),
        TripoAPIKey:     os.Getenv("TRIPO_API_KEY"),
        ImgBBAPIKey:     os.Getenv("IMGBB_API_KEY"),
        StripeSecretKey: os.Getenv("STRIPE_SECRET_KEY"),
        UploadFolder:    "scans",
    }
}

func getEnv(key, fallback string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return fallback
}