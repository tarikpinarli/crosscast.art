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
	_ = godotenv.Load()

	return &Config{
		Port:            getEnv("PORT", "5005"),
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