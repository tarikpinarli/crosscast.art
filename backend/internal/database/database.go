package database

import (
    "fmt"
    "log"
    "os"
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "github.com/tarikpinarli/dualSculp-backend/internal/models" // 👈 Import your models
)

var DB *gorm.DB

func Connect() {
    dsn := fmt.Sprintf(
        "host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
        os.Getenv("DB_HOST"),
        os.Getenv("DB_USER"),
        os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_NAME"),
        os.Getenv("DB_PORT"),
    )

    var err error

    // 1. RETRY LOGIC: Try connecting 10 times before giving up
    for i := 1; i <= 10; i++ {
        DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
        if err == nil {
            break // Connected!
        }
        log.Printf("⏳ Database not ready yet... retrying (%d/10)", i)
        time.Sleep(2 * time.Second)
    }

    if err != nil {
        log.Fatal("❌ Failed to connect to database after multiple attempts:", err)
    }

    log.Println("✅ Connected to Database successfully")

    // 2. MIGRATION: Create the table automatically
    log.Println("🏃 Running Migrations...")
    err = DB.AutoMigrate(&models.User{})
    if err != nil {
        log.Fatal("❌ Migration failed:", err)
    }
    log.Println("✅ Migration complete: Users table ready")
}